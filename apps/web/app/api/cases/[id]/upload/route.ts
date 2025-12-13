// API route for uploading evidence files
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { uploadToSpaces } from '@/lib/spaces';
import { v4 as uuidv4 } from 'uuid';

interface FileData {
    name: string;
    type: string;
    data: string; // base64
}

// POST /api/cases/[id]/upload - Upload evidence files
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { files } = await request.json() as { files: FileData[] };
        const caseId = params.id;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return NextResponse.json(
                { error: 'No files provided' },
                { status: 400 }
            );
        }

        const uploaded = [];

        for (const file of files) {
            if (!file.name || !file.data) continue;

            // Decode base64
            const buffer = Buffer.from(file.data, 'base64');

            // Create Spaces key
            const key = `cases/${caseId}/evidence/${Date.now()}-${file.name}`;

            // Upload to Spaces
            await uploadToSpaces(key, buffer, file.type || 'application/octet-stream');

            // Determine kind
            let kind = 'document';
            if (file.type?.startsWith('image/')) kind = 'photo';
            else if (file.type === 'text/plain' || file.name.endsWith('.txt')) kind = 'statement';

            // Insert into database
            const id = uuidv4();
            await query(`
        INSERT INTO evidence (id, case_id, kind, filename, spaces_key, mime_type)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, caseId, kind, file.name, key, file.type]);

            uploaded.push({
                id,
                kind,
                filename: file.name,
                spaces_key: key,
            });
        }

        return NextResponse.json({
            success: true,
            uploaded,
            count: uploaded.length
        });
    } catch (error) {
        console.error('Error uploading evidence:', error);
        return NextResponse.json(
            { error: 'Failed to upload evidence' },
            { status: 500 }
        );
    }
}
