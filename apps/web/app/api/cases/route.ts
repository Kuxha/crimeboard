// API route for case CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/cases - List all cases
export async function GET() {
    try {
        const cases = await query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM evidence e WHERE e.case_id = c.id) as evidence_count
      FROM cases c 
      ORDER BY c.created_at DESC
    `);

        return NextResponse.json({ cases });
    } catch (error) {
        console.error('Error fetching cases:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cases' },
            { status: 500 }
        );
    }
}

// POST /api/cases - Create a new case
export async function POST(request: NextRequest) {
    try {
        const { title } = await request.json();

        if (!title || typeof title !== 'string') {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            );
        }

        const id = uuidv4();
        const result = await queryOne(`
      INSERT INTO cases (id, title, status)
      VALUES ($1, $2, 'open')
      RETURNING *
    `, [id, title.trim()]);

        return NextResponse.json({ case: result });
    } catch (error) {
        console.error('Error creating case:', error);
        return NextResponse.json(
            { error: 'Failed to create case' },
            { status: 500 }
        );
    }
}
