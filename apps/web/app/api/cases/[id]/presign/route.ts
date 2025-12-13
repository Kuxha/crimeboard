// API route for getting presigned upload URLs
// This avoids the 1MB Functions payload limit by letting browser upload directly to Spaces
import { NextRequest, NextResponse } from 'next/server';
import { getSignedWriteUrl } from '@/lib/spaces';

// POST /api/cases/[id]/presign - Get presigned URL for direct upload to Spaces
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { filename, contentType } = await request.json();
        const caseId = params.id;

        if (!filename) {
            return NextResponse.json(
                { error: 'filename is required' },
                { status: 400 }
            );
        }

        // Create Spaces key
        const key = `cases/${caseId}/evidence/${Date.now()}-${filename}`;

        // Get presigned PUT URL (valid for 1 hour)
        const uploadUrl = await getSignedWriteUrl(key, 3600);

        return NextResponse.json({
            success: true,
            key,
            uploadUrl,
            contentType: contentType || 'application/octet-stream'
        });
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload URL' },
            { status: 500 }
        );
    }
}
