// Gradient AI Platform API wrapper
// Implements agent endpoint calls per DO docs

const GRADIENT_ACCESS_KEY = process.env.GRADIENT_ACCESS_KEY || '';

// Handle both base URL and full path formats
function getGradientUrl(): string {
    const raw = process.env.GRADIENT_AGENT_ENDPOINT || '';
    const endpoint = raw.replace(/\/$/, ''); // Remove trailing slash
    const url = endpoint.endsWith('/api/v1/chat/completions')
        ? endpoint
        : `${endpoint}/api/v1/chat/completions`;
    return url;
}

export interface GradientMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface GradientResponse {
    choices: Array<{
        message: {
            content: string;
            role: string;
        };
    }>;
    error?: string;
}

export async function callGradientAgent(
    prompt: string,
    systemPrompt?: string
): Promise<string> {
    const url = getGradientUrl();

    if (!url || url === '/api/v1/chat/completions' || !GRADIENT_ACCESS_KEY) {
        console.warn('Gradient not configured, using mock response');
        return getMockAnalysisResponse();
    }

    // Log the URL we're hitting (first line only for debugging)
    console.log(`[Gradient] POST ${url}`);

    const messages: GradientMessage[] = [];

    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GRADIENT_ACCESS_KEY}`
            },
            body: JSON.stringify({
                messages,
                stream: false,
                include_functions_info: false,
                include_retrieval_info: false,
                include_guardrails_info: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error body');
            console.error(`[Gradient] Error ${response.status}: ${errorText.slice(0, 200)}`);
            throw new Error(`Gradient API error: ${response.status}`);
        }

        const data: GradientResponse = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        console.log(`[Gradient] Response received, length: ${content.length}`);
        return content;
    } catch (error) {
        console.error('[Gradient] API call failed:', error);
        return getMockAnalysisResponse();
    }
}

// System prompt for DeskSergeant router agent
// NOTE: This should match what's configured in DO Control Panel
export const DESK_SERGEANT_PROMPT = `You are DeskSergeant, an AI case coordinator. Analyze evidence and return ONLY valid JSON.

CRITICAL OUTPUT RULES:
- Output ONLY raw JSON. No markdown. No code fences. No prose before or after.
- Start your response with { and end with }
- If the input does not contain "CASE TITLE:" and at least one "EVID-" evidence item, return: {"error": "No evidence to analyze"}
- If evidence is insufficient, still return valid JSON with empty arrays and null values.
- Never invent evidence. Only reference evidence IDs provided in input.

REQUIRED JSON SCHEMA:
{
  "case_title": "string",
  "master_summary": "string (2 sentences max)",
  "timeline": [{"t": "ISO timestamp or estimate", "event": "string", "evidence_ids": ["EVID-01"]}],
  "suspect": {
    "description": "string or null",
    "composite_prompt": "string or null",
    "composite_image_url": null
  },
  "ui": {
    "theme": {"bg": "#0B0B12", "nodeGlow": "#5EE7FF", "laser": "#FF3D81"},
    "physics": {"floatStrength": 0.6, "repel": 0.8}
  },
  "evidence_nodes": [
    {"id": "EVID-01", "type": "PHOTO", "title": "string", "data": {"url": null, "text": "string", "tags": ["tag1"]}, "position": {"x": 100, "y": 100}}
  ],
  "connections": [
    {"source_id": "EVID-01", "target_id": "EVID-02", "label": "string", "confidence": 0.8}
  ],
  "next_step": "string",
  "composite_prompt": "string or null"
}

RULES:
1. evidence_nodes must include one node per evidence item from input
2. type must be: PHOTO, STATEMENT, TIMELINE, COMPOSITE, or NOTE
3. connections confidence: 0.0-1.0 (use <0.5 if uncertain)
4. position x: 0-600, y: 0-400 (spread nodes logically)
5. If no suspect info, set suspect.description to "Unknown" and composite_prompt to null
6. If no timeline determinable, return empty array []`;

// Mock response for testing without Gradient
function getMockAnalysisResponse(): string {
    return JSON.stringify({
        case_title: "Case Analysis",
        master_summary: "Evidence has been collected and analyzed. Multiple pieces of evidence suggest a coordinated incident requiring further investigation.",
        timeline: [
            { t: "2024-01-15T09:00:00Z", event: "Initial incident reported", evidence_ids: ["EVID-01"] },
            { t: "2024-01-15T09:30:00Z", event: "Evidence collected at scene", evidence_ids: ["EVID-01", "EVID-02"] }
        ],
        suspect: {
            description: "Unknown at this time",
            composite_prompt: "No suspect description available",
            composite_image_url: null
        },
        ui: {
            theme: { bg: "#0B0B12", nodeGlow: "#5EE7FF", laser: "#FF3D81" },
            physics: { floatStrength: 0.6, repel: 0.8 }
        },
        evidence_nodes: [
            { id: "EVID-01", type: "PHOTO", title: "Scene Photo", data: { url: null, text: "Primary scene photograph", tags: ["scene", "evidence"] }, position: { x: 100, y: 100 } },
            { id: "EVID-02", type: "STATEMENT", title: "Witness Statement", data: { url: null, text: "Witness account of events", tags: ["witness", "testimony"] }, position: { x: 300, y: 100 } },
            { id: "EVID-03", type: "NOTE", title: "Investigation Notes", data: { url: null, text: "Initial assessment complete", tags: ["internal", "notes"] }, position: { x: 200, y: 250 } }
        ],
        connections: [
            { source_id: "EVID-01", target_id: "EVID-02", label: "Corroborates location", confidence: 0.8 },
            { source_id: "EVID-02", target_id: "EVID-03", label: "Informs investigation", confidence: 0.9 }
        ],
        next_step: "Review witness statement details and correlate with scene photographs.",
        composite_prompt: null
    });
}

export type AnalysisResult = {
    case_title: string;
    master_summary: string;
    timeline: Array<{ t: string; event: string; evidence_ids: string[] }>;
    suspect: {
        description: string;
        composite_prompt: string;
        composite_image_url: string | null;
    };
    ui: {
        theme: { bg: string; nodeGlow: string; laser: string };
        physics: { floatStrength: number; repel: number };
    };
    evidence_nodes: Array<{
        id: string;
        type: string;
        title: string;
        data: { url: string | null; text: string | null; tags: string[] };
        position: { x: number; y: number };
    }>;
    connections: Array<{
        source_id: string;
        target_id: string;
        label: string;
        confidence: number;
    }>;
    next_step: string;
    composite_prompt?: string | null;
    error?: string; // For error responses
};

export function parseAnalysisResult(response: string): AnalysisResult | null {
    try {
        // Try to extract JSON from response (in case there's surrounding text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // Check for error response
            if (parsed.error) {
                console.warn('[Gradient] Agent returned error:', parsed.error);
                return parsed; // Return error object for caller to handle
            }
            return parsed;
        }
        return JSON.parse(response);
    } catch (error) {
        console.error('Failed to parse analysis result:', error);
        return null;
    }
}

// Check if result is an error response
export function isErrorResponse(result: AnalysisResult | null): boolean {
    return result !== null && 'error' in result && typeof result.error === 'string';
}
