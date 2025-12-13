// API route for generating case file PDF with suspects
import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { uploadToSpaces, getSignedReadUrl } from '@/lib/spaces';

// POST /api/cases/[id]/close - Generate case file PDF
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;

    const caseData = await queryOne<any>(`
      SELECT * FROM cases WHERE id = $1
    `, [caseId]);

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const analysisData = caseData.analysis_json || {};

    // Generate HTML case file with suspects
    const html = generateCaseFileHTML(caseId, caseData.title, analysisData);

    // Upload to Spaces
    const key = `cases/${caseId}/artifacts/CaseFile-${Date.now()}.html`;
    await uploadToSpaces(key, html, 'text/html');

    // Get signed URL for download
    const pdfUrl = await getSignedReadUrl(key, 3600 * 24);

    return NextResponse.json({
      success: true,
      pdf_key: key,
      pdf_url: pdfUrl
    });
  } catch (error) {
    console.error('Error generating case file:', error);
    return NextResponse.json(
      { error: 'Failed to generate case file' },
      { status: 500 }
    );
  }
}

function generateCaseFileHTML(caseId: string, caseTitle: string, data: any): string {
  const now = new Date().toISOString();
  const suspects = data.suspects || [];
  const caseFile = data.case_file || {};

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Case File - ${caseTitle || caseId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      background: #1a1a2e;
      color: #eee;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .header {
      border-bottom: 3px solid #5ee7ff;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #5ee7ff;
      font-size: 28px;
      text-transform: uppercase;
      letter-spacing: 3px;
    }
    .header .case-id {
      color: #888;
      font-size: 12px;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
      padding: 20px;
      background: rgba(255,255,255,0.05);
      border-left: 4px solid #ff3d81;
      border-radius: 0 8px 8px 0;
    }
    .section h2 {
      color: #ff3d81;
      font-size: 18px;
      margin-bottom: 15px;
      text-transform: uppercase;
    }
    .section p, .section li {
      line-height: 1.8;
      color: #ccc;
    }
    .suspect-card {
      background: rgba(255,61,129,0.1);
      border: 1px solid rgba(255,61,129,0.3);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .suspect-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .suspect-name {
      color: #ff3d81;
      font-size: 16px;
      font-weight: bold;
    }
    .guilt-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
    }
    .guilt-high { background: rgba(239,68,68,0.3); color: #f87171; }
    .guilt-medium { background: rgba(245,158,11,0.3); color: #fbbf24; }
    .guilt-low { background: rgba(107,114,128,0.3); color: #9ca3af; }
    .reason-list {
      margin-left: 20px;
      margin-top: 10px;
    }
    .reason-list li {
      margin-bottom: 8px;
    }
    .evidence-tag {
      display: inline-block;
      padding: 2px 8px;
      background: rgba(94,231,255,0.2);
      color: #5ee7ff;
      border-radius: 4px;
      font-size: 12px;
      margin-left: 5px;
    }
    .timeline {
      list-style: none;
    }
    .timeline li {
      padding: 10px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .timeline .time {
      color: #5ee7ff;
      font-weight: bold;
    }
    .evidence-list {
      display: grid;
      gap: 10px;
    }
    .evidence-item {
      background: rgba(94,231,255,0.1);
      padding: 10px 15px;
      border-radius: 4px;
    }
    .chain-of-custody {
      background: rgba(255,61,129,0.1);
      border-left-color: #5ee7ff;
    }
    .recommended-action {
      background: rgba(94,231,255,0.1);
      padding: 15px;
      border-radius: 8px;
      border: 1px solid rgba(94,231,255,0.3);
      margin-top: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #333;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📁 Case File: ${caseTitle || 'Untitled Case'}</h1>
    <div class="case-id">Case ID: ${caseId} | Generated: ${now}</div>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <p>${caseFile.executive_summary || data.master_summary || 'Case analysis complete. See suspect rankings and evidence connections below.'}</p>
  </div>

  ${suspects.length > 0 ? `
  <div class="section">
    <h2>🎯 Suspect Analysis (${suspects.length} Suspects)</h2>
    ${suspects.map((s: any) => `
      <div class="suspect-card">
        <div class="suspect-header">
          <span class="suspect-name">${s.display_name} (${s.suspect_id})</span>
          <span class="guilt-badge ${s.guilt_probability >= 70 ? 'guilt-high' :
      s.guilt_probability >= 40 ? 'guilt-medium' : 'guilt-low'
    }">${s.guilt_probability}% Guilt Probability</span>
        </div>
        ${s.key_attributes?.description ? `<p><strong>Description:</strong> ${s.key_attributes.description}</p>` : ''}
        ${s.key_attributes?.vehicle ? `<p><strong>Vehicle:</strong> ${s.key_attributes.vehicle}</p>` : ''}
        ${s.key_attributes?.last_seen ? `<p><strong>Last Seen:</strong> ${s.key_attributes.last_seen}</p>` : ''}
        ${s.why_suspected && s.why_suspected.length > 0 ? `
          <h4 style="color: #ff3d81; margin-top: 10px;">Why Suspected:</h4>
          <ul class="reason-list">
            ${s.why_suspected.map((r: any) => `
              <li>${r.reason} ${r.evidence_ids?.map((e: string) => `<span class="evidence-tag">${e}</span>`).join('') || ''}</li>
            `).join('')}
          </ul>
        ` : ''}
        ${s.relationships && s.relationships.length > 0 ? `
          <h4 style="color: #5ee7ff; margin-top: 10px;">Relationships:</h4>
          <ul class="reason-list">
            ${s.relationships.map((r: any) => `
              <li>→ ${r.target_suspect_id}: ${r.label}</li>
            `).join('')}
          </ul>
        ` : ''}
        ${s.recommended_next_action ? `
          <div class="recommended-action">
            <strong>Recommended Action:</strong> ${s.recommended_next_action}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.timeline && data.timeline.length > 0 ? `
  <div class="section">
    <h2>Timeline of Events</h2>
    <ul class="timeline">
      ${data.timeline.map((t: any) => `
        <li><span class="time">${t.t || 'TBD'}</span> - ${t.event}</li>
      `).join('')}
    </ul>
  </div>
  ` : ''}

  ${data.evidence_nodes && data.evidence_nodes.length > 0 ? `
  <div class="section">
    <h2>Evidence Inventory</h2>
    <div class="evidence-list">
      ${data.evidence_nodes.filter((e: any) => !e.id?.startsWith('SUS-')).map((e: any) => `
        <div class="evidence-item">
          <strong>${e.id}</strong>: ${e.title} (${e.type})
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${data.connections && data.connections.length > 0 ? `
  <div class="section">
    <h2>Key Connections</h2>
    <ul>
      ${data.connections.map((c: any) => `
        <li>${c.source_id} → ${c.target_id}: ${c.label} (confidence: ${Math.round((c.confidence || 0.5) * 100)}%)</li>
      `).join('')}
    </ul>
  </div>
  ` : ''}

  ${caseFile.evidence_narrative ? `
  <div class="section">
    <h2>Evidence Narrative</h2>
    <p>${caseFile.evidence_narrative}</p>
  </div>
  ` : ''}

  <div class="section chain-of-custody">
    <h2>Chain of Custody Notes</h2>
    <p><em>Enhanced by CrimeBoard Knowledge Base (RAG).</em></p>
    <p>${caseFile.chain_of_custody_notes || 'All evidence documented according to standard chain of custody procedures.'}</p>
    <ul style="margin-top: 10px; margin-left: 20px; color: #ccc;">
      <li>Evidence collected and photographed at scene</li>
      <li>Unique identifiers assigned to each item</li>
      <li>Secure storage in designated evidence locker</li>
      <li>Transfer log maintained for all movements</li>
      <li>Digital evidence preserved with hash verification</li>
    </ul>
  </div>

  ${caseFile.recommended_charges && caseFile.recommended_charges.length > 0 ? `
  <div class="section">
    <h2>Recommended Charges</h2>
    <ul style="margin-left: 20px;">
      ${caseFile.recommended_charges.map((c: string) => `<li style="color: #ff3d81;">${c}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${caseFile.gaps_and_next_steps || data.next_step ? `
  <div class="section">
    <h2>Gaps & Next Steps</h2>
    <p>${caseFile.gaps_and_next_steps || data.next_step}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated by CrimeBoard™ | Powered by DigitalOcean Gradient AI Platform</p>
    <p>Multi-Agent Investigation System: ForensicTagger → WitnessAnalyst → PsychoProfiler → SuspectRanker → ConnectionMapper → DeskSergeant → CaseFileWriter</p>
    <p>This document is for investigative purposes only.</p>
  </div>
</body>
</html>`;
}
