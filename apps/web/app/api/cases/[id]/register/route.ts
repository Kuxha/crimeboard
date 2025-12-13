// API route for registering uploaded evidence (after direct Spaces upload)
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

interface RegisterData {
    filename: string;
    spaces_key: string;
    mime_type: string;
}

// POST /api/cases/[id]/register - Register evidence after direct Spaces upload
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { files } = await request.json() as { files: RegisterData[] };
        const caseId = params.id;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return NextResponse.json(
                { error: 'No files provided' },
                { status: 400 }
            );
        }

        const registered = [];

        for (const file of files) {
            if (!file.filename || !file.spaces_key) continue;

            // Determine kind from mime type
            let kind = 'document';
            if (file.mime_type?.startsWith('image/')) kind = 'photo';
            else if (file.mime_type === 'text/plain' || file.filename.endsWith('.txt')) kind = 'statement';

            // Insert into database
            const id = uuidv4();
            await query(`
        INSERT INTO evidence (id, case_id, kind, filename, spaces_key, mime_type)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, caseId, kind, file.filename, file.spaces_key, file.mime_type]);

            registered.push({
                id,
                kind,
                filename: file.filename,
                spaces_key: file.spaces_key,
            });
        }

        return NextResponse.json({
            success: true,
            registered,
            count: registered.length
        });
    } catch (error) {
        console.error('Error registering evidence:', error);
        return NextResponse.json(
            { error: 'Failed to register evidence' },
            { status: 500 }
        );
    }
}
