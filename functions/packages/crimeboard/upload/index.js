// Upload function - receives files and stores in Spaces
// Returns { body: { uploaded: [...] } } per DO Functions requirement

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

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
    const { case_id, files } = args;
    
    if (!case_id) {
      return { body: { error: 'case_id is required' } };
    }

    const s3 = getS3Client();
    const bucket = process.env.SPACES_BUCKET;
    const uploaded = [];

    // Handle base64 encoded files from the request
    const fileList = Array.isArray(files) ? files : [files];
    
    for (const file of fileList) {
      if (!file || !file.name || !file.data) continue;
      
      const key = `cases/${case_id}/evidence/${Date.now()}-${file.name}`;
      const buffer = Buffer.from(file.data, 'base64');
      
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
        ACL: 'private'
      }));

      // Determine kind from mime type
      let kind = 'document';
      if (file.type?.startsWith('image/')) kind = 'photo';
      else if (file.type === 'text/plain' || file.name.endsWith('.txt')) kind = 'statement';
      else if (file.type === 'application/pdf') kind = 'document';

      uploaded.push({
        kind,
        filename: file.name,
        spaces_key: key,
        mime_type: file.type
      });
    }

    return { 
      body: { 
        success: true,
        case_id,
        uploaded 
      } 
    };
  } catch (error) {
    console.error('Upload error:', error);
    return { 
      body: { 
        error: error.message || 'Upload failed' 
      } 
    };
  }
}

exports.main = main;
