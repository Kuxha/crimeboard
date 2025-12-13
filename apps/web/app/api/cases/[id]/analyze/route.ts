// API route for analyzing case evidence with Gradient AI
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { callGradientAgent, DESK_SERGEANT_PROMPT, parseAnalysisResult } from '@/lib/gradient';

// POST /api/cases/[id]/analyze - Run AI analysis on case evidence
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

        // Build prompt for Gradient agent
        const evidenceList = evidence.map((e: any, i: number) => {
            return `EVID-${String(i + 1).padStart(2, '0')}: ${e.kind} - "${e.filename}"${e.extracted_text_json ? ` - Text: ${JSON.stringify(e.extracted_text_json)}` : ''
                }${e.tags_json ? ` - Tags: ${JSON.stringify(e.tags_json)}` : ''
                }`;
        }).join('\n');

        const userPrompt = `Analyze the following case and evidence:

CASE TITLE: ${caseData.title}
CASE ID: ${caseId}

EVIDENCE ITEMS:
${evidenceList}

Build the evidence board JSON with nodes for each evidence item, connections between related evidence, and a timeline of events if determinable. Output ONLY the JSON response, no other text.`;

        // Call Gradient agent
        const response = await callGradientAgent(userPrompt, DESK_SERGEANT_PROMPT);

        // Parse response
        const analysis = parseAnalysisResult(response);

        if (!analysis) {
            console.error('Failed to parse analysis response:', response);
            throw new Error('Invalid analysis response format');
        }

        // Update case with analysis
        await query(`
      UPDATE cases 
      SET analysis_json = $1, status = 'analyzed', updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(analysis), caseId]);

        // Store board nodes
        if (analysis.evidence_nodes) {
            for (const node of analysis.evidence_nodes) {
                await query(`
          INSERT INTO board_nodes (case_id, node_id, node_type, title, data_json, x, y)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (case_id, node_id) 
          DO UPDATE SET title = $4, data_json = $5, x = $6, y = $7
        `, [
                    caseId,
                    node.id,
                    node.type,
                    node.title,
                    JSON.stringify(node.data),
                    node.position?.x || 0,
                    node.position?.y || 0
                ]);
            }
        }

        // Store edges
        if (analysis.connections) {
            // Clear existing edges
            await query(`DELETE FROM board_edges WHERE case_id = $1`, [caseId]);

            for (const conn of analysis.connections) {
                await query(`
          INSERT INTO board_edges (case_id, source_id, target_id, label, confidence)
          VALUES ($1, $2, $3, $4, $5)
        `, [caseId, conn.source_id, conn.target_id, conn.label, conn.confidence]);
            }
        }

        return NextResponse.json({
            success: true,
            analysis
        });
    } catch (error) {
        console.error('Error analyzing case:', error);

        // Update status to error
        await query(`UPDATE cases SET status = 'error' WHERE id = $1`, [params.id]).catch(() => { });

        return NextResponse.json(
            { error: 'Failed to analyze case' },
            { status: 500 }
        );
    }
}
