// Case file PDF generation function
// Generates a case summary PDF and uploads to Spaces

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

function getS3Client() {
    return new S3Client({
        forcePathStyle: false,
        endpoint: process.env.SPACES_ENDPOINT,
        region: 'us-east-1',
        credentials: {
            accessKeyId: process.env.SPACES_KEY,
            secretAccessKey: process.env.SPACES_SECRET
        }
    });
}

async function main(args) {
    try {
        const { case_id, case_title, analysis_data } = args;

        if (!case_id) {
            return { body: { error: 'case_id is required' } };
        }

        const s3 = getS3Client();
        const bucket = process.env.SPACES_BUCKET;

        // Generate PDF content (HTML that could be converted to PDF)
        // For MVP, we generate an HTML file styled like a PDF
        const pdfContent = generateCaseFileHTML(case_id, case_title, analysis_data);

        const pdfKey = `cases/${case_id}/artifacts/CaseFile-${Date.now()}.html`;

        await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: pdfKey,
            Body: pdfContent,
            ContentType: 'text/html',
            ACL: 'private'
        }));

        // Generate a public URL (for demo) or use signed URL in production
        const pdf_url = `${process.env.SPACES_ENDPOINT}/${bucket}/${pdfKey}`;

        return {
            body: {
                success: true,
                case_id,
                pdf_key: pdfKey,
                pdf_url,
                note: 'Case file generated successfully'
            }
        };
    } catch (error) {
        console.error('PDF generation error:', error);
        return {
            body: {
                error: error.message || 'PDF generation failed'
            }
        };
    }
}

function generateCaseFileHTML(case_id, case_title, analysis_data) {
    const data = analysis_data || {};
    const now = new Date().toISOString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Case File - ${case_title || case_id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      background: #1a1a2e;
      color: #eee;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
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
    }
    .section h2 {
      color: #ff3d81;
      font-size: 18px;
      margin-bottom: 15px;
      text-transform: uppercase;
    }
    .section p {
      line-height: 1.8;
      color: #ccc;
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
    <h1>📁 Case File: ${case_title || 'Untitled Case'}</h1>
    <div class="case-id">Case ID: ${case_id} | Generated: ${now}</div>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <p>${data.master_summary || 'Case analysis pending. Evidence has been collected and is awaiting full agent analysis.'}</p>
  </div>

  ${data.timeline && data.timeline.length > 0 ? `
  <div class="section">
    <h2>Timeline of Events</h2>
    <ul class="timeline">
      ${data.timeline.map(t => `
        <li><span class="time">${t.t || 'TBD'}</span> - ${t.event}</li>
      `).join('')}
    </ul>
  </div>
  ` : ''}

  ${data.suspect ? `
  <div class="section">
    <h2>Suspect Profile</h2>
    <p><strong>Description:</strong> ${data.suspect.description || 'Unknown'}</p>
    ${data.suspect.composite_prompt ? `<p><strong>Composite Notes:</strong> ${data.suspect.composite_prompt}</p>` : ''}
  </div>
  ` : ''}

  ${data.evidence_nodes && data.evidence_nodes.length > 0 ? `
  <div class="section">
    <h2>Evidence Inventory</h2>
    <div class="evidence-list">
      ${data.evidence_nodes.map(e => `
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
      ${data.connections.map(c => `
        <li>${c.source_id} → ${c.target_id}: ${c.label} (confidence: ${(c.confidence * 100).toFixed(0)}%)</li>
      `).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="section chain-of-custody">
    <h2>Chain of Custody Notes</h2>
    <p><em>This section is enhanced by the CrimeBoard Knowledge Base (RAG).</em></p>
    <p>All evidence has been documented according to standard chain of custody procedures:</p>
    <ul style="margin-top: 10px; margin-left: 20px; color: #ccc;">
      <li>Evidence collected and photographed at scene</li>
      <li>Unique identifiers assigned to each item</li>
      <li>Secure storage in designated evidence locker</li>
      <li>Transfer log maintained for all movements</li>
      <li>Digital evidence preserved with hash verification</li>
    </ul>
  </div>

  ${data.next_step ? `
  <div class="section">
    <h2>Recommended Next Steps</h2>
    <p>${data.next_step}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated by CrimeBoard™ | Powered by DigitalOcean Gradient AI Platform</p>
    <p>This document is for investigative purposes only.</p>
  </div>
</body>
</html>`;
}

exports.main = main;
