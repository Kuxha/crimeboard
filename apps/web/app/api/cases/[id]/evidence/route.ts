// API route for listing case evidence
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/cases/[id]/evidence - List evidence for a case
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

        return NextResponse.json({ evidence });
    } catch (error) {
        console.error('Error fetching evidence:', error);
        return NextResponse.json(
            { error: 'Failed to fetch evidence' },
            { status: 500 }
        );
    }
}
