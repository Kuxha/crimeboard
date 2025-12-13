// Deterministic lane-based layout for murder board
// Assigns x,y positions to nodes based on type/kind to avoid overlaps

const LANE_CONFIG = {
    SCENE: { x: 100, label: 'Scene Evidence' },
    WITNESS: { x: 450, label: 'Witnesses' },
    OTHER: { x: 800, label: 'Other Evidence' },
    SUSPECT: { x: 450, label: 'Suspects' }, // Centered for bottom row
};

const VERTICAL_SPACING = 220;
const HORIZONTAL_SPACING = 360;
const SUSPECT_ROW_Y = 500; // Suspects at bottom
const EVIDENCE_START_Y = 80;

// Keywords for classification
const SCENE_KEYWORDS = ['scene', 'photo', 'image', 'crime', 'forensic', 'blood', 'weapon', 'fingerprint', 'dna', 'ballistic'];
const WITNESS_KEYWORDS = ['witness', 'statement', 'interview', 'testimony', 'account', 'report', 'deposition'];
const SUSPECT_TYPES = ['SUSPECT', 'suspect', 'poi', 'person_of_interest'];

interface EvidenceNode {
    id: string;
    type: string;
    title: string;
    data?: {
        url?: string | null;
        text?: string | null;
        tags?: string[];
        kind?: string;
        guilt_probability?: number;
        suspect_data?: any;
    };
    position?: { x: number; y: number };
}

interface Evidence {
    id: string;
    kind: string;
    filename: string;
    tags_json?: any;
}

type Lane = 'SCENE' | 'WITNESS' | 'SUSPECT' | 'OTHER';

function classifyNode(node: EvidenceNode, evidence?: Evidence[]): Lane {
    // Check if it's a suspect
    if (node.id.startsWith('SUS-') || SUSPECT_TYPES.includes(node.type?.toLowerCase())) {
        return 'SUSPECT';
    }

    const nodeType = (node.type || '').toLowerCase();
    const title = (node.title || '').toLowerCase();
    const kind = (node.data?.kind || '').toLowerCase();
    const tags = (node.data?.tags || []).map(t => t.toLowerCase());

    // Find matching evidence to get more context
    const matchingEvidence = evidence?.find(e =>
        node.id.includes(e.id) ||
        node.title?.includes(e.filename) ||
        e.filename?.includes(node.title || '')
    );
    const filename = (matchingEvidence?.filename || '').toLowerCase();
    const evidenceKind = (matchingEvidence?.kind || '').toLowerCase();

    const allText = `${nodeType} ${title} ${kind} ${filename} ${evidenceKind} ${tags.join(' ')}`;

    // Check scene evidence
    if (nodeType === 'photo' || evidenceKind === 'image' ||
        SCENE_KEYWORDS.some(kw => allText.includes(kw))) {
        return 'SCENE';
    }

    // Check witness
    if (nodeType === 'statement' || nodeType === 'text' ||
        evidenceKind === 'text' || evidenceKind === 'statement' ||
        WITNESS_KEYWORDS.some(kw => allText.includes(kw))) {
        return 'WITNESS';
    }

    return 'OTHER';
}

function hasOverlap(positions: Array<{ x: number; y: number }>, newPos: { x: number; y: number }): boolean {
    return positions.some(p =>
        Math.abs(p.x - newPos.x) < HORIZONTAL_SPACING * 0.8 &&
        Math.abs(p.y - newPos.y) < VERTICAL_SPACING * 0.8
    );
}

export function assignDefaultLayout(
    analysisNodes: EvidenceNode[],
    evidence?: Evidence[]
): EvidenceNode[] {
    if (!analysisNodes || analysisNodes.length === 0) return [];

    // Group nodes by lane
    const lanes: Record<Lane, EvidenceNode[]> = {
        SCENE: [],
        WITNESS: [],
        SUSPECT: [],
        OTHER: [],
    };

    for (const node of analysisNodes) {
        const lane = classifyNode(node, evidence);
        lanes[lane].push(node);
    }

    const assignedPositions: Array<{ x: number; y: number }> = [];
    const result: EvidenceNode[] = [];

    // Position evidence nodes (SCENE, WITNESS, OTHER) in top section
    const evidenceLanes: Lane[] = ['SCENE', 'WITNESS', 'OTHER'];

    for (const lane of evidenceLanes) {
        const nodes = lanes[lane];
        const baseX = LANE_CONFIG[lane].x;

        nodes.forEach((node, index) => {
            let x = baseX;
            let y = EVIDENCE_START_Y + index * VERTICAL_SPACING;

            // Add small jitter if there's overlap
            let attempts = 0;
            while (hasOverlap(assignedPositions, { x, y }) && attempts < 10) {
                x += (Math.random() - 0.5) * 50;
                y += 20;
                attempts++;
            }

            const position = { x: Math.round(x), y: Math.round(y) };
            assignedPositions.push(position);

            result.push({
                ...node,
                position,
            });
        });
    }

    // Position suspect nodes in bottom row, centered
    const suspects = lanes.SUSPECT;
    if (suspects.length > 0) {
        const totalWidth = (suspects.length - 1) * HORIZONTAL_SPACING;
        const startX = Math.max(100, (1100 - totalWidth) / 2); // Center in typical board width

        suspects.forEach((node, index) => {
            let x = startX + index * HORIZONTAL_SPACING;
            let y = SUSPECT_ROW_Y;

            // Add small jitter if needed
            let attempts = 0;
            while (hasOverlap(assignedPositions, { x, y }) && attempts < 5) {
                x += (Math.random() - 0.5) * 30;
                attempts++;
            }

            const position = { x: Math.round(x), y: Math.round(y) };
            assignedPositions.push(position);

            result.push({
                ...node,
                position,
            });
        });
    }

    return result;
}

// Check if nodes need layout (missing positions or all at 0,0)
export function needsLayout(nodes: EvidenceNode[]): boolean {
    if (!nodes || nodes.length === 0) return false;

    const validPositions = nodes.filter(n =>
        n.position &&
        (n.position.x !== 0 || n.position.y !== 0)
    );

    // Need layout if less than half have valid positions
    if (validPositions.length < nodes.length / 2) return true;

    // Check for overlaps (multiple nodes at same position)
    const positionStrings = validPositions.map(n => `${n.position?.x},${n.position?.y}`);
    const uniquePositions = new Set(positionStrings);
    if (uniquePositions.size < validPositions.length * 0.7) return true;

    return false;
}

// Get lane label for a node (for UI display)
export function getNodeLane(node: EvidenceNode, evidence?: Evidence[]): string {
    const lane = classifyNode(node, evidence);
    return LANE_CONFIG[lane].label;
}
