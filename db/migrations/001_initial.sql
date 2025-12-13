-- CrimeBoard Database Schema
-- Run with: psql $DATABASE_URL -f db/migrations/001_initial.sql

-- Cases table
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    analysis_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence table
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    kind VARCHAR(50) NOT NULL, -- 'photo', 'statement', 'document'
    filename VARCHAR(255) NOT NULL,
    spaces_key VARCHAR(512) NOT NULL,
    mime_type VARCHAR(100),
    extracted_text_json JSONB,
    tags_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Board nodes for React Flow
CREATE TABLE IF NOT EXISTS board_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    node_id VARCHAR(50) NOT NULL, -- e.g., 'EVID-01'
    node_type VARCHAR(50) NOT NULL, -- 'PHOTO', 'STATEMENT', 'TIMELINE', 'COMPOSITE', 'NOTE'
    title VARCHAR(255) NOT NULL,
    data_json JSONB,
    x FLOAT DEFAULT 0,
    y FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(case_id, node_id)
);

-- Board edges for connections
CREATE TABLE IF NOT EXISTS board_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    source_id VARCHAR(50) NOT NULL,
    target_id VARCHAR(50) NOT NULL,
    label VARCHAR(255),
    confidence FLOAT DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs for async processing
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL, -- 'analyze', 'pdf'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    result_json JSONB,
    error TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_board_nodes_case_id ON board_nodes(case_id);
CREATE INDEX IF NOT EXISTS idx_board_edges_case_id ON board_edges(case_id);
CREATE INDEX IF NOT EXISTS idx_jobs_case_id ON jobs(case_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
