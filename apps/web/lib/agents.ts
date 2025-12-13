// Multi-agent orchestration for CrimeBoard
// Calls 7 specialized agents in sequence for complete investigation analysis

const GRADIENT_ACCESS_KEY = process.env.GRADIENT_ACCESS_KEY || '';

function getGradientUrl(): string {
  const raw = process.env.GRADIENT_AGENT_ENDPOINT || '';
  const endpoint = raw.replace(/\/$/, '');
  return endpoint.endsWith('/api/v1/chat/completions')
    ? endpoint
    : `${endpoint}/api/v1/chat/completions`;
}

async function callAgent(systemPrompt: string, userPrompt: string): Promise<string> {
  const url = getGradientUrl();

  if (!url || url === '/api/v1/chat/completions' || !GRADIENT_ACCESS_KEY) {
    console.warn('[Agent] Not configured, returning empty');
    return '{}';
  }

  console.log(`[Agent] Calling with prompt length: ${userPrompt.length}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GRADIENT_ACCESS_KEY}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        include_functions_info: false,
        include_retrieval_info: false,
        include_guardrails_info: false
      })
    });

    if (!response.ok) {
      console.error(`[Agent] Error: ${response.status}`);
      return '{}';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '{}';
  } catch (error) {
    console.error('[Agent] Failed:', error);
    return '{}';
  }
}

function parseJSON(text: string): any {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// =============================================================================
// AGENT PROMPTS
// =============================================================================

const FORENSIC_TAGGER_PROMPT = `You are ForensicTagger, a forensic evidence analyst.
Given evidence items, extract structured tags.

OUTPUT JSON ONLY (no prose):
{
  "evidence_tags": [
    {
      "evidence_id": "EVID-01",
      "objects": ["item1", "item2"],
      "locations": ["place1"],
      "timestamps": ["YYYY-MM-DD HH:MM"],
      "people_descriptors": ["description"],
      "vehicles": ["make model color"],
      "forensic_notes": ["observation"]
    }
  ]
}`;

const WITNESS_ANALYST_PROMPT = `You are WitnessAnalyst, extracting information from witness statements.
Identify suspect descriptions, timeline hints, and key claims.

OUTPUT JSON ONLY:
{
  "suspect_descriptors": [
    {
      "source_evidence_id": "EVID-XX",
      "physical": { "height": "", "build": "", "hair": "", "age_range": "", "distinguishing": [] },
      "clothing": [],
      "behavior": [],
      "confidence": 0.0-1.0
    }
  ],
  "timeline_hints": [
    { "time_estimate": "", "event": "", "source_evidence_id": "EVID-XX" }
  ],
  "key_claims": [
    { "claim": "", "source_evidence_id": "EVID-XX", "confidence": 0.0-1.0 }
  ]
}`;

const PSYCHO_PROFILER_PROMPT = `You are PsychoProfiler, providing behavioral analysis.
Based ONLY on evidence, suggest behavioral patterns. No medical diagnoses.

OUTPUT JSON ONLY:
{
  "behavioral_hypotheses": [
    {
      "hypothesis": "description of potential behavior pattern",
      "supporting_evidence": ["EVID-XX"],
      "confidence": 0.0-1.0
    }
  ],
  "modus_operandi": {
    "description": "",
    "indicators": []
  }
}`;

const SUSPECT_RANKER_PROMPT = `You are SuspectRanker. Based on all analysis, identify potential suspects.
Each suspect needs guilt_probability (0-100) and reasons citing evidence.

CRITICAL: You MUST always return 1-3 suspects if there is ANY human-related evidence:
- Witness statements mentioning people
- Photos with people
- Names, descriptions, or behaviors mentioned
Even if evidence is weak, return suspects with LOW guilt_probability (10-30%).

OUTPUT JSON ONLY:
{
  "suspects": [
    {
      "suspect_id": "SUS-01",
      "display_name": "Descriptive name (use 'Unknown Male #1' if no name)",
      "guilt_probability": 10-100,
      "why_suspected": [
        { "reason": "explanation", "evidence_ids": ["EVID-XX"] }
      ],
      "key_attributes": {
        "description": "physical description or 'Unknown'",
        "vehicle": "if known or null",
        "last_seen": "location/time or 'Unknown'"
      },
      "relationships": [
        { "target_suspect_id": "SUS-02", "label": "relationship type", "evidence_ids": [] }
      ],
      "recommended_next_action": "investigative suggestion"
    }
  ]
}

RULES:
- ALWAYS return 1-3 suspects minimum if any human mentioned in evidence
- Use low guilt_probability (10-30%) for weak evidence
- Probabilities don't need to sum to 100
- NEVER invent facts, but DO create suspect entries for described persons
- If only one person mentioned, still create SUS-01 for them`;

const CONNECTION_MAPPER_PROMPT = `You are ConnectionMapper. Build the evidence graph.
Create nodes for ALL evidence items AND ALL suspects, plus edges between them.

CRITICAL REQUIREMENTS:
1. Create a node for EVERY evidence item (EVID-XX)
2. Create a node for EVERY suspect (SUS-XX) from the suspects list
3. Create edges from evidence to suspects they support
4. Create edges between suspects if they have relationships

OUTPUT JSON ONLY:
{
  "nodes": [
    {
      "id": "EVID-01",
      "type": "PHOTO|STATEMENT|PDF|TEXT|TIMELINE",
      "title": "evidence filename or description",
      "position": { "x": 50-550, "y": 50-180 }
    },
    {
      "id": "SUS-01",
      "type": "SUSPECT",
      "title": "Suspect Name (guilt%)",
      "position": { "x": 50-550, "y": 280-380 }
    }
  ],
  "edges": [
    {
      "source_id": "EVID-01",
      "target_id": "SUS-01",
      "label": "supports: reason",
      "relationship": "supports",
      "confidence": 0.0-1.0
    },
    {
      "source_id": "SUS-01",
      "target_id": "SUS-02",
      "label": "seen_with: at location",
      "relationship": "seen_with",
      "confidence": 0.0-1.0
    }
  ]
}

LAYOUT RULES:
- Evidence nodes: TOP HALF (y: 50-200), spread across x: 50-550
- Suspect nodes: BOTTOM HALF (y: 280-380), spread across x: 100-500
- Every suspect MUST have at least one edge to evidence
- Relationship types: supports, contradicts, relates, seen_with`;

const DESK_SERGEANT_PROMPT = `You are DeskSergeant, the chief investigator.
Merge all agent outputs into a final comprehensive analysis.

OUTPUT JSON ONLY:
{
  "case_title": "string",
  "master_summary": "2-3 sentence summary",
  "timeline": [{ "t": "ISO or estimate", "event": "string", "evidence_ids": [] }],
  "suspects": [],
  "evidence_nodes": [],
  "connections": [],
  "ui": {
    "theme": { "bg": "#0B0B12", "nodeGlow": "#5EE7FF", "laser": "#FF3D81" },
    "physics": { "floatStrength": 0.6, "repel": 0.8 }
  },
  "next_step": "recommended action",
  "prosecutor_notes": "key points for prosecution"
}`;

const CASE_FILE_WRITER_PROMPT = `You are CaseFileWriter. Create prosecutor-ready narrative sections.

OUTPUT JSON ONLY:
{
  "executive_summary": "2-3 paragraphs",
  "evidence_narrative": "detailed evidence walkthrough",
  "suspect_analysis": "each suspect with rationale",
  "timeline_narrative": "chronological account",
  "chain_of_custody_notes": "evidence handling notes",
  "recommended_charges": ["charge1", "charge2"],
  "gaps_and_next_steps": "what's missing and what to do"
}`;

// =============================================================================
// ORCHESTRATION
// =============================================================================

export interface OrchestrationResult {
  forensicTags: any;
  witnessAnalysis: any;
  psychoProfile: any;
  suspects: any;
  connectionMap: any;
  finalAnalysis: any;
  caseFile: any;
}

export async function runMultiAgentOrchestration(
  caseTitle: string,
  caseId: string,
  evidenceList: string
): Promise<OrchestrationResult> {
  console.log('[Orchestration] Starting multi-agent analysis...');

  const baseContext = `CASE TITLE: ${caseTitle}\nCASE ID: ${caseId}\n\nEVIDENCE ITEMS:\n${evidenceList}`;

  // Step 1: ForensicTagger
  console.log('[Orchestration] Step 1: ForensicTagger');
  const forensicRaw = await callAgent(FORENSIC_TAGGER_PROMPT, baseContext);
  const forensicTags = parseJSON(forensicRaw);

  // Step 2: WitnessAnalyst  
  console.log('[Orchestration] Step 2: WitnessAnalyst');
  const witnessRaw = await callAgent(WITNESS_ANALYST_PROMPT, `${baseContext}\n\nFORENSIC TAGS:\n${JSON.stringify(forensicTags)}`);
  const witnessAnalysis = parseJSON(witnessRaw);

  // Step 3: PsychoProfiler
  console.log('[Orchestration] Step 3: PsychoProfiler');
  const psychoRaw = await callAgent(PSYCHO_PROFILER_PROMPT, `${baseContext}\n\nWITNESS ANALYSIS:\n${JSON.stringify(witnessAnalysis)}`);
  const psychoProfile = parseJSON(psychoRaw);

  // Step 4: SuspectRanker
  console.log('[Orchestration] Step 4: SuspectRanker');
  const suspectContext = `${baseContext}\n\nFORENSIC TAGS:\n${JSON.stringify(forensicTags)}\n\nWITNESS ANALYSIS:\n${JSON.stringify(witnessAnalysis)}\n\nBEHAVIORAL PROFILE:\n${JSON.stringify(psychoProfile)}`;
  const suspectRaw = await callAgent(SUSPECT_RANKER_PROMPT, suspectContext);
  const suspects = parseJSON(suspectRaw);

  // Step 5: ConnectionMapper
  console.log('[Orchestration] Step 5: ConnectionMapper');
  const mapContext = `${baseContext}\n\nSUSPECTS:\n${JSON.stringify(suspects)}`;
  const mapRaw = await callAgent(CONNECTION_MAPPER_PROMPT, mapContext);
  const connectionMap = parseJSON(mapRaw);

  // Step 6: DeskSergeant (Final Merge)
  console.log('[Orchestration] Step 6: DeskSergeant (merge)');
  const mergeContext = `${baseContext}\n\nFORENSIC TAGS:\n${JSON.stringify(forensicTags)}\n\nWITNESS ANALYSIS:\n${JSON.stringify(witnessAnalysis)}\n\nBEHAVIORAL PROFILE:\n${JSON.stringify(psychoProfile)}\n\nSUSPECTS:\n${JSON.stringify(suspects)}\n\nCONNECTION MAP:\n${JSON.stringify(connectionMap)}`;
  const finalRaw = await callAgent(DESK_SERGEANT_PROMPT, mergeContext);
  const finalAnalysis = parseJSON(finalRaw);

  // Step 7: CaseFileWriter
  console.log('[Orchestration] Step 7: CaseFileWriter');
  const caseRaw = await callAgent(CASE_FILE_WRITER_PROMPT, `${baseContext}\n\nFINAL ANALYSIS:\n${JSON.stringify(finalAnalysis)}`);
  const caseFile = parseJSON(caseRaw);

  console.log('[Orchestration] Complete!');

  return {
    forensicTags,
    witnessAnalysis,
    psychoProfile,
    suspects,
    connectionMap,
    finalAnalysis,
    caseFile
  };
}

// Build the final board-ready output
export function buildFinalOutput(orchestration: OrchestrationResult, caseTitle: string) {
  const { finalAnalysis, suspects, connectionMap, caseFile } = orchestration;

  // Merge suspects into final output
  const mergedSuspects = suspects.suspects || finalAnalysis.suspects || [];

  // Build evidence nodes from connection map or final analysis
  const nodes = connectionMap.nodes || finalAnalysis.evidence_nodes || [];
  const edges = connectionMap.edges || finalAnalysis.connections || [];

  // Add suspect nodes if not present
  for (const suspect of mergedSuspects) {
    const existingNode = nodes.find((n: any) => n.id === suspect.suspect_id);
    if (!existingNode) {
      nodes.push({
        id: suspect.suspect_id,
        type: 'SUSPECT',
        title: `${suspect.display_name} (${suspect.guilt_probability}%)`,
        data: {
          text: suspect.key_attributes?.description || '',
          tags: suspect.why_suspected?.map((w: any) => w.reason.slice(0, 20)) || [],
          guilt_probability: suspect.guilt_probability,
          suspect_data: suspect
        },
        position: {
          x: 100 + (nodes.length % 4) * 150,
          y: 300
        }
      });
    }
  }

  return {
    case_title: finalAnalysis.case_title || caseTitle,
    master_summary: finalAnalysis.master_summary || '',
    timeline: finalAnalysis.timeline || [],
    suspects: mergedSuspects,
    evidence_nodes: nodes,
    connections: edges,
    ui: finalAnalysis.ui || {
      theme: { bg: '#0B0B12', nodeGlow: '#5EE7FF', laser: '#FF3D81' },
      physics: { floatStrength: 0.6, repel: 0.8 }
    },
    next_step: finalAnalysis.next_step || '',
    prosecutor_notes: finalAnalysis.prosecutor_notes || caseFile.executive_summary || '',
    case_file: caseFile
  };
}
