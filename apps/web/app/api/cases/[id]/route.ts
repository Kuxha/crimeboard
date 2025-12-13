// API route for individual case operations
import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

// GET /api/cases/[id] - Get a single case
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const caseData = await queryOne(`
      SELECT * FROM cases WHERE id = $1
    `, [params.id]);

        if (!caseData) {
            return NextResponse.json(
                { error: 'Case not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ case: caseData });
    } catch (error) {
        console.error('Error fetching case:', error);
        return NextResponse.json(
            { error: 'Failed to fetch case' },
            { status: 500 }
        );
    }
}

// DELETE /api/cases/[id] - Delete a case
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await queryOne(`DELETE FROM cases WHERE id = $1 RETURNING id`, [params.id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting case:', error);
        return NextResponse.json(
            { error: 'Failed to delete case' },
            { status: 500 }
        );
    }
}
