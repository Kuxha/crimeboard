#!/usr/bin/env npx ts-node
/**
 * Test script for Gradient AI agent
 * Run with: npx ts-node scripts/test-agent.ts
 * Or: npm run test:agent (after adding to package.json)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from apps/web/.env.local
dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

const GRADIENT_ACCESS_KEY = process.env.GRADIENT_ACCESS_KEY || '';

function getGradientUrl(): string {
    const raw = process.env.GRADIENT_AGENT_ENDPOINT || '';
    const endpoint = raw.replace(/\/$/, '');
    const url = endpoint.endsWith('/api/v1/chat/completions')
        ? endpoint
        : `${endpoint}/api/v1/chat/completions`;
    return url;
}

async function testAgent() {
    const url = getGradientUrl();

    console.log('=== Gradient Agent Test ===');
    console.log(`URL: ${url}`);
    console.log(`Key: ${GRADIENT_ACCESS_KEY ? GRADIENT_ACCESS_KEY.slice(0, 8) + '...' : 'NOT SET'}`);
    console.log('');

    if (!url || url === '/api/v1/chat/completions' || !GRADIENT_ACCESS_KEY) {
        console.error('❌ Missing GRADIENT_AGENT_ENDPOINT or GRADIENT_ACCESS_KEY');
        process.exit(1);
    }

    const testPrompt = `Analyze the following case and evidence:

CASE TITLE: Test Case
CASE ID: test-123

EVIDENCE ITEMS:
EVID-01: photo - "crime_scene.jpg"
EVID-02: statement - "witness_statement.txt"

Build the evidence board JSON.`;

    console.log('Sending test request...');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GRADIENT_ACCESS_KEY}`
            },
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: testPrompt }
                ],
                stream: false,
                include_functions_info: false,
                include_retrieval_info: false,
                include_guardrails_info: false
            })
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText.slice(0, 500));
            process.exit(1);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        console.log('✅ Success!');
        console.log('');
        console.log('Response (first 500 chars):');
        console.log(content.slice(0, 500));

        // Try to parse as JSON
        try {
            const parsed = JSON.parse(content);
            console.log('');
            console.log('✅ Valid JSON response');
            if (parsed.error) {
                console.log('⚠️ Agent returned error:', parsed.error);
            } else if (parsed.evidence_nodes) {
                console.log(`📊 Nodes: ${parsed.evidence_nodes.length}`);
                console.log(`🔗 Connections: ${parsed.connections?.length || 0}`);
            }
        } catch {
            console.log('');
            console.log('⚠️ Response is not valid JSON');
        }
    } catch (error) {
        console.error('❌ Request failed:', error);
        process.exit(1);
    }
}

testAgent();
