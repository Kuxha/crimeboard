// Signed URL function - generates presigned URLs for Spaces objects
// Follows AWS SDK pattern documented in DO Spaces docs

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

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
        const { spaces_key, action, expires_seconds } = args;

        if (!spaces_key) {
            return { body: { error: 'spaces_key is required' } };
        }

        const validActions = ['read', 'write'];
        const requestedAction = (action || 'read').toLowerCase();

        if (!validActions.includes(requestedAction)) {
            return { body: { error: 'action must be "read" or "write"' } };
        }

        const s3 = getS3Client();
        const bucket = process.env.SPACES_BUCKET;
        const expiresIn = Math.min(expires_seconds || 3600, 604800); // Max 7 days

        let command;
        if (requestedAction === 'write') {
            command = new PutObjectCommand({
                Bucket: bucket,
                Key: spaces_key
            });
        } else {
            command = new GetObjectCommand({
                Bucket: bucket,
                Key: spaces_key
            });
        }

        const signed_url = await getSignedUrl(s3, command, { expiresIn });

        return {
            body: {
                success: true,
                spaces_key,
                action: requestedAction,
                signed_url,
                expires_in: expiresIn
            }
        };
    } catch (error) {
        console.error('Signed URL error:', error);
        return {
            body: {
                error: error.message || 'Signed URL generation failed'
            }
        };
    }
}

exports.main = main;
