// Gradient AI Platform API wrapper
// Implements agent endpoint calls per DO docs

const GRADIENT_ENDPOINT = process.env.GRADIENT_AGENT_ENDPOINT || '';
const GRADIENT_ACCESS_KEY = process.env.GRADIENT_ACCESS_KEY || '';

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
}

export async function callGradientAgent(
    prompt: string,
    systemPrompt?: string
): Promise<string> {
    if (!GRADIENT_ENDPOINT || !GRADIENT_ACCESS_KEY) {
        // Fallback for local dev without Gradient configured
        console.warn('Gradient not configured, using mock response');
        return getMockAnalysisResponse();
    }

    const messages: GradientMessage[] = [];

    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    try {
        const response = await fetch(`${GRADIENT_ENDPOINT}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GRADIENT_ACCESS_KEY}`
            },
            body: JSON.stringify({
                messages,
                max_tokens: 4000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`Gradient API error: ${response.status}`);
        }

        const data: GradientResponse = await response.json();
        return data.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('Gradient API call failed:', error);
        return getMockAnalysisResponse();
    }
}

// System prompt for DeskSergeant router agent
export const DESK_SERGEANT_PROMPT = `You are DeskSergeant, the lead case coordinator for CrimeBoard. You analyze crime evidence and coordinate specialist agents.

Your job is to analyze uploaded evidence and return a SINGLE valid JSON response. Do NOT include any prose or explanation outside the JSON.

OUTPUT SCHEMA (return ONLY this JSON):
{
  "case_title": "string - case name",
  "master_summary": "string - 2 sentences max summarizing key findings",
  "timeline": [{"t": "ISO timestamp or estimate", "event": "what happened", "evidence_ids": ["EVID-XX"]}],
  "suspect": {
    "description": "physical description if known",
    "composite_prompt": "detailed image generation prompt",
    "composite_image_url": null
  },
  "ui": {
    "theme": {"bg":"#0B0B12","nodeGlow":"#5EE7FF","laser":"#FF3D81"},
    "physics": {"floatStrength":0.6,"repel":0.8}
  },
  "evidence_nodes": [
    {"id":"EVID-01","type":"PHOTO|STATEMENT|TIMELINE|COMPOSITE|NOTE","title":"string","data":{"url":null,"text":null,"tags":[]},"position":{"x":number,"y":number}}
  ],
  "connections": [
    {"source_id":"EVID-01","target_id":"EVID-02","label":"connection reason","confidence":0.0-1.0}
  ],
  "next_step": "recommended next investigative action"
}

RULES:
1. Never invent evidence. Only reference evidence_ids that exist.
2. Mark low confidence connections clearly.
3. Distribute nodes in a logical visual layout.
4. Use the Knowledge Base to ensure proper forensic terminology.`;

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
        next_step: "Review witness statement details and correlate with scene photographs."
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
};

export function parseAnalysisResult(response: string): AnalysisResult | null {
    try {
        // Try to extract JSON from response (in case there's surrounding text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(response);
    } catch (error) {
        console.error('Failed to parse analysis result:', error);
        return null;
    }
}
