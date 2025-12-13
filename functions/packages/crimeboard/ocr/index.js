// OCR function - extracts text from images/PDFs
// For MVP, uses simple text extraction hints
// TODO: Integrate with full OCR service if needed

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

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

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function main(args) {
    try {
        const { case_id, spaces_key } = args;

        if (!spaces_key) {
            return { body: { error: 'spaces_key is required' } };
        }

        const s3 = getS3Client();
        const bucket = process.env.SPACES_BUCKET;

        // Get the file from Spaces
        const response = await s3.send(new GetObjectCommand({
            Bucket: bucket,
            Key: spaces_key
        }));

        const buffer = await streamToBuffer(response.Body);
        const contentType = response.ContentType || '';

        let text = '';
        let pages = 1;
        let entities_hint = [];

        // For text files, read directly
        if (contentType.includes('text/') || spaces_key.endsWith('.txt')) {
            text = buffer.toString('utf-8');
            // Simple entity extraction
            const dateMatches = text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/g) || [];
            const timeMatches = text.match(/\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?/g) || [];
            entities_hint = [
                ...dateMatches.map(d => ({ type: 'DATE', value: d })),
                ...timeMatches.map(t => ({ type: 'TIME', value: t }))
            ];
        }
        // For images, we'd integrate with an OCR API
        // For MVP, return placeholder indicating OCR needed
        else if (contentType.includes('image/')) {
            text = '[Image requires OCR processing - placeholder for demo]';
            entities_hint = [{ type: 'NOTE', value: 'Visual evidence - see image tags' }];
        }
        // For PDFs
        else if (contentType.includes('pdf')) {
            text = '[PDF requires OCR/parsing - placeholder for demo]';
            pages = 1; // Would be extracted from actual PDF
            entities_hint = [{ type: 'NOTE', value: 'Document evidence' }];
        }

        return {
            body: {
                success: true,
                case_id,
                spaces_key,
                text,
                pages,
                entities_hint
            }
        };
    } catch (error) {
        console.error('OCR error:', error);
        return {
            body: {
                error: error.message || 'OCR processing failed'
            }
        };
    }
}

exports.main = main;
