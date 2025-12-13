// API route for listing case evidence with presigned preview URLs
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSignedReadUrl } from '@/lib/spaces';

// GET /api/cases/[id]/evidence - List evidence for a case with preview URLs
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const evidence = await query(`
      SELECT * FROM evidence 
      WHERE case_id = $1 
      ORDER BY created_at DESC
    `, [params.id]);

        // Generate presigned read URLs for each evidence item
        const evidenceWithUrls = await Promise.all(
            evidence.map(async (e: any) => {
                let preview_url = null;

                if (e.spaces_key) {
                    try {
                        // Generate 1-hour presigned read URL
                        preview_url = await getSignedReadUrl(e.spaces_key, 3600);
                    } catch (err) {
                        console.error(`Failed to generate preview URL for ${e.spaces_key}:`, err);
                    }
                }

                return {
                    ...e,
                    preview_url
                };
            })
        );

        return NextResponse.json({ evidence: evidenceWithUrls });
    } catch (error) {
        console.error('Error fetching evidence:', error);
        return NextResponse.json(
            { error: 'Failed to fetch evidence' },
            { status: 500 }
        );
    }
}
