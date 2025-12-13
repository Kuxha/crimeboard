// API route for analyzing case evidence with Multi-Agent Orchestration
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { runMultiAgentOrchestration, buildFinalOutput } from '@/lib/agents';
import { assignDefaultLayout, needsLayout } from '@/lib/layout';

// POST /api/cases/[id]/analyze - Run multi-agent AI analysis on case evidence
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const caseId = params.id;

        // Get case data
        const caseData = await queryOne<any>(`SELECT * FROM cases WHERE id = $1`, [caseId]);
        if (!caseData) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 });
        }

        // Get all evidence
        const evidence = await query<any>(`
      SELECT * FROM evidence WHERE case_id = $1 ORDER BY created_at
    `, [caseId]);

        if (evidence.length === 0) {
            return NextResponse.json({ error: 'No evidence to analyze' }, { status: 400 });
        }

        // Update case status to analyzing
        await query(`UPDATE cases SET status = 'analyzing' WHERE id = $1`, [caseId]);

        console.log(`[Analyze] Starting analysis for case ${caseId} with ${evidence.length} evidence items`);

        // Build evidence list string for agents
        const evidenceList = evidence.map((e: any, i: number) => {
            const evidId = `EVID-${String(i + 1).padStart(2, '0')}`;
            return `${evidId}: ${e.kind} - "${e.filename}"${e.extracted_text_json ? ` - Text: ${JSON.stringify(e.extracted_text_json)}` : ''
                }${e.tags_json ? ` - Tags: ${JSON.stringify(e.tags_json)}` : ''
                }`;
        }).join('\n');

        // Run multi-agent orchestration
        const orchestration = await runMultiAgentOrchestration(
            caseData.title,
            caseId,
            evidenceList
        );

        // Build final output
        let analysis = buildFinalOutput(orchestration, caseData.title);

        // Validate we got something useful, fallback to evidence-based nodes
        if (!analysis.evidence_nodes?.length && !analysis.suspects?.length) {
            console.warn('[Analyze] No nodes or suspects generated, using fallback');
            analysis.evidence_nodes = evidence.map((e: any, i: number) => ({
                id: `EVID-${String(i + 1).padStart(2, '0')}`,
                type: e.kind === 'image' ? 'PHOTO' : e.kind === 'pdf' ? 'PDF' : 'STATEMENT',
                title: e.filename,
                data: {
                    url: null,
                    text: e.filename,
                    tags: [],
                    kind: e.kind
                },
                position: { x: 0, y: 0 }
            }));
        }

        // Apply deterministic lane layout if positions are missing or overlapping
        if (needsLayout(analysis.evidence_nodes)) {
            console.log('[Analyze] Applying deterministic lane layout...');
            analysis.evidence_nodes = assignDefaultLayout(analysis.evidence_nodes, evidence);
        }

        // Update case with analysis
        await query(`
      UPDATE cases 
      SET analysis_json = $1, status = 'analyzed', updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(analysis), caseId]);

        // Store board nodes with computed positions
        if (analysis.evidence_nodes) {
            // Clear existing nodes first
            await query(`DELETE FROM board_nodes WHERE case_id = $1`, [caseId]);

            for (const node of analysis.evidence_nodes) {
                await query(`
          INSERT INTO board_nodes (case_id, node_id, node_type, title, data_json, x, y)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
                    caseId,
                    node.id,
                    node.type,
                    node.title,
                    JSON.stringify(node.data || {}),
                    node.position?.x || 0,
                    node.position?.y || 0
                ]);
            }
        }

        // Store edges
        if (analysis.connections) {
            await query(`DELETE FROM board_edges WHERE case_id = $1`, [caseId]);

            for (const conn of analysis.connections) {
                await query(`
          INSERT INTO board_edges (case_id, source_id, target_id, label, confidence)
          VALUES ($1, $2, $3, $4, $5)
        `, [
                    caseId,
                    conn.source_id,
                    conn.target_id,
                    conn.label,
                    conn.confidence || 0.5
                ]);
            }
        }

        console.log(`[Analyze] Complete: ${analysis.evidence_nodes?.length || 0} nodes, ${analysis.suspects?.length || 0} suspects`);

        return NextResponse.json({
            success: true,
            analysis,
            stats: {
                nodes: analysis.evidence_nodes?.length || 0,
                connections: analysis.connections?.length || 0,
                suspects: analysis.suspects?.length || 0
            }
        });
    } catch (error) {
        console.error('Error analyzing case:', error);

        await query(`UPDATE cases SET status = 'error' WHERE id = $1`, [params.id]).catch(() => { });

        return NextResponse.json(
            { error: 'Failed to analyze case', details: (error as Error).message },
            { status: 500 }
        );
    }
}
