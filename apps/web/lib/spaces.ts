// Spaces Object Storage client
// Uses AWS SDK v3 per DO docs: https://docs.digitalocean.com/products/spaces/how-to/use-aws-sdks/

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    forcePathStyle: false,
    endpoint: process.env.SPACES_ENDPOINT || 'https://nyc3.digitaloceanspaces.com',
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.SPACES_KEY || '',
        secretAccessKey: process.env.SPACES_SECRET || ''
    }
});

const BUCKET = process.env.SPACES_BUCKET || 'crimeboard-evidence';

export async function uploadToSpaces(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string = 'application/octet-stream'
): Promise<string> {
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'private'
    }));
    return key;
}

export async function getSignedReadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}

export async function getSignedWriteUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}

export { s3Client, BUCKET };
