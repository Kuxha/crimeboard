// Image tagging function - analyzes images for objects, scenes, text
// For MVP, returns simulated tags based on filename hints
// TODO: Integrate with vision API for production

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

// Simulated tagging for demo - would use vision API in production
function generateTags(filename, mimeType) {
    const lowerName = filename.toLowerCase();
    const tags = [];
    const objects = [];
    let scene_summary = 'Scene analysis pending';
    let text_in_image = null;

    // Simulate intelligent tagging based on filename hints
    if (lowerName.includes('crime') || lowerName.includes('scene')) {
        tags.push('crime_scene', 'evidence', 'investigation');
        scene_summary = 'Crime scene photograph showing area of interest';
        objects.push('floor', 'wall', 'debris');
    }
    if (lowerName.includes('weapon') || lowerName.includes('gun') || lowerName.includes('knife')) {
        tags.push('weapon', 'evidence', 'dangerous');
        objects.push('weapon');
        scene_summary = 'Weapon evidence photograph';
    }
    if (lowerName.includes('car') || lowerName.includes('vehicle')) {
        tags.push('vehicle', 'transportation', 'evidence');
        objects.push('car', 'license_plate');
        scene_summary = 'Vehicle related evidence';
    }
    if (lowerName.includes('person') || lowerName.includes('suspect') || lowerName.includes('witness')) {
        tags.push('person', 'human', 'potential_identification');
        objects.push('person', 'face', 'clothing');
        scene_summary = 'Person of interest photograph';
    }
    if (lowerName.includes('document') || lowerName.includes('paper') || lowerName.includes('note')) {
        tags.push('document', 'text', 'paper');
        objects.push('paper', 'text');
        text_in_image = 'Document detected - text extraction available';
        scene_summary = 'Documentary evidence';
    }
    if (lowerName.includes('blood') || lowerName.includes('dna')) {
        tags.push('biological_evidence', 'forensic', 'dna_potential');
        scene_summary = 'Biological evidence requiring forensic analysis';
    }

    // Default tags if nothing matched
    if (tags.length === 0) {
        tags.push('evidence', 'photo', 'unclassified');
        objects.push('unknown');
        scene_summary = 'Photographic evidence awaiting classification';
    }

    // Add timestamp tag
    tags.push(`analyzed_${new Date().toISOString().split('T')[0]}`);

    return { tags, objects, scene_summary, text_in_image };
}

async function main(args) {
    try {
        const { case_id, spaces_key } = args;

        if (!spaces_key) {
            return { body: { error: 'spaces_key is required' } };
        }

        const s3 = getS3Client();
        const bucket = process.env.SPACES_BUCKET;

        // Verify file exists
        const response = await s3.send(new GetObjectCommand({
            Bucket: bucket,
            Key: spaces_key
        }));

        const filename = spaces_key.split('/').pop() || 'unknown';
        const mimeType = response.ContentType || 'image/jpeg';

        // Generate tags (simulated for MVP)
        const { tags, objects, scene_summary, text_in_image } = generateTags(filename, mimeType);

        return {
            body: {
                success: true,
                case_id,
                spaces_key,
                tags,
                objects,
                scene_summary,
                text_in_image
            }
        };
    } catch (error) {
        console.error('Tag-image error:', error);
        return {
            body: {
                error: error.message || 'Image tagging failed'
            }
        };
    }
}

exports.main = main;
