'use client';

import { useCallback, useMemo, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    NodeProps,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Layout constants matching server-side layout.ts
const LANE_X = {
    SCENE: 100,
    WITNESS: 450,
    OTHER: 800,
    SUSPECT: 450,
};
const VERTICAL_SPACING = 220;
const HORIZONTAL_SPACING = 360;
const SUSPECT_ROW_Y = 500;
const EVIDENCE_START_Y = 80;

interface AnalysisData {
    evidence_nodes: Array<{
        id: string;
        type: string;
        title: string;
        data: {
            url: string | null;
            text: string | null;
            tags: string[];
            guilt_probability?: number;
            suspect_data?: any;
            preview_url?: string;
            kind?: string;
        };
        position: { x: number; y: number };
    }>;
    connections: Array<{
        source_id: string;
        target_id: string;
        label: string;
        confidence: number;
        relationship?: string;
    }>;
    suspects?: Array<{
        suspect_id: string;
        display_name: string;
        guilt_probability: number;
        why_suspected: Array<{ reason: string; evidence_ids: string[] }>;
        key_attributes: any;
    }>;
}

interface EvidenceBoardProps {
    analysisData: AnalysisData;
    evidenceUrls?: Record<string, string>;
    onNodeClick: (node: any) => void;
}

// Classify node for fallback layout
function classifyNodeType(node: any): 'SCENE' | 'WITNESS' | 'SUSPECT' | 'OTHER' {
    if (node.id.startsWith('SUS-') || node.type === 'SUSPECT') return 'SUSPECT';
    const type = (node.type || '').toLowerCase();
    const title = (node.title || '').toLowerCase();
    const kind = (node.data?.kind || '').toLowerCase();

    if (type === 'photo' || kind === 'image' || title.includes('scene') || title.includes('photo')) {
        return 'SCENE';
    }
    if (type === 'statement' || type === 'text' || kind === 'text' || title.includes('witness')) {
        return 'WITNESS';
    }
    return 'OTHER';
}

// Evidence node component
function EvidenceNode({ data, selected }: NodeProps) {
    // Safe extraction with explicit string coercion for strict TS
    const rawType = (data as Record<string, unknown>)?.nodeType ?? (data as Record<string, unknown>)?.type ?? 'NOTE';
    const nodeType: string = String(rawType).toUpperCase();
    const guiltProbability = typeof (data as Record<string, unknown>)?.guilt_probability === 'number'
        ? (data as Record<string, unknown>).guilt_probability as number
        : null;
    const tags = Array.isArray((data as Record<string, unknown>)?.tags)
        ? (data as Record<string, unknown>).tags as string[]
        : [];
    const label = String((data as Record<string, unknown>)?.label ?? (data as Record<string, unknown>)?.id ?? '');
    const title = String((data as Record<string, unknown>)?.title ?? '');
    const previewUrl = (data as Record<string, unknown>)?.preview_url as string | undefined;

    const typeColors: Record<string, string> = {
        PHOTO: '#10B981',
        STATEMENT: '#F59E0B',
        TIMELINE: '#8B5CF6',
        COMPOSITE: '#FF3D81',
        NOTE: '#6B7280',
        PDF: '#3B82F6',
        TEXT: '#F59E0B',
        SUSPECT: '#FF3D81',
    };

    const typeIcons: Record<string, string> = {
        PHOTO: '📷',
        STATEMENT: '📝',
        TIMELINE: '⏰',
        COMPOSITE: '🎨',
        NOTE: '📌',
        PDF: '📄',
        TEXT: '📝',
        SUSPECT: '🔍',
    };

    const isSuspect = nodeType === 'SUSPECT';

    return (
        <div
            className={`evidence-node type-${nodeType} ${selected ? 'ring-2 ring-laser-cyan' : ''}`}
            style={{
                borderLeftColor: typeColors[nodeType] || typeColors.NOTE,
                minWidth: isSuspect ? '200px' : '180px',
                maxWidth: '220px',
                background: isSuspect
                    ? 'linear-gradient(135deg, rgba(255,61,129,0.25) 0%, #12121c 100%)'
                    : 'linear-gradient(135deg, rgba(94,231,255,0.1) 0%, #12121c 100%)',
                boxShadow: isSuspect
                    ? '0 0 20px rgba(255,61,129,0.3)'
                    : '0 0 15px rgba(94,231,255,0.2)',
            }}
        >
            <Handle type="target" position={Position.Top} className="!bg-laser-cyan !w-3 !h-3" />

            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{typeIcons[nodeType] || '📌'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isSuspect ? 'bg-laser-pink/30 text-laser-pink' : 'bg-noir-800 text-slate-400'
                    }`}>
                    {label}
                </span>
                {isSuspect && guiltProbability !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${guiltProbability >= 70 ? 'bg-red-500/40 text-red-300' :
                        guiltProbability >= 40 ? 'bg-yellow-500/40 text-yellow-300' :
                            'bg-slate-500/40 text-slate-300'
                        }`}>
                        {guiltProbability}%
                    </span>
                )}
            </div>

            <div className={`text-sm font-medium truncate ${isSuspect ? 'text-laser-pink' : 'text-white'
                }`}>
                {title}
            </div>

            {/* Image preview for photos */}
            {nodeType === 'PHOTO' && previewUrl && (
                <div className="mt-2 rounded overflow-hidden border border-noir-600">
                    <img
                        src={previewUrl}
                        alt={title}
                        className="w-full h-20 object-cover"
                    />
                </div>
            )}

            {tags.length > 0 && !isSuspect && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {tags.slice(0, 3).map((tag: string, i: number) => (
                        <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 bg-laser-cyan/10 text-laser-cyan rounded"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Suspect guilt bar */}
            {isSuspect && guiltProbability !== null && (
                <div className="mt-2">
                    <div className="h-1.5 bg-noir-900 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${guiltProbability >= 70 ? 'bg-red-500' :
                                guiltProbability >= 40 ? 'bg-yellow-500' : 'bg-slate-500'
                                }`}
                            style={{ width: `${guiltProbability}%` }}
                        />
                    </div>
                </div>
            )}

            <Handle type="source" position={Position.Bottom} className="!bg-laser-pink !w-3 !h-3" />
        </div>
    );
}

const nodeTypes = {
    evidence: EvidenceNode,
};

export default function EvidenceBoard({ analysisData, evidenceUrls = {}, onNodeClick }: EvidenceBoardProps) {

    // Apply layout - use server positions if valid, otherwise fallback layout
    const initialNodes: Node[] = useMemo(() => {
        if (!analysisData?.evidence_nodes) return [];

        const allNodes = analysisData.evidence_nodes;

        // Check if we have valid positions from server
        const hasValidPositions = allNodes.every(n =>
            n.position && (n.position.x !== 0 || n.position.y !== 0)
        );

        if (hasValidPositions) {
            // Use server-computed positions
            return allNodes.map((node) => ({
                id: node.id,
                type: 'evidence',
                position: { x: node.position.x, y: node.position.y },
                data: {
                    id: node.id,
                    label: node.id,
                    title: node.title,
                    nodeType: node.id.startsWith('SUS-') ? 'SUSPECT' : (node.type || 'NOTE'),
                    text: node.data?.text,
                    url: node.data?.url,
                    preview_url: node.data?.preview_url || evidenceUrls[node.id],
                    tags: node.data?.tags || [],
                    guilt_probability: node.data?.guilt_probability,
                    suspect_data: node.data?.suspect_data,
                    originalData: node,
                },
            }));
        }

        // Fallback: compute layout client-side
        const lanes: Record<string, any[]> = {
            SCENE: [],
            WITNESS: [],
            OTHER: [],
            SUSPECT: [],
        };

        allNodes.forEach(node => {
            const lane = classifyNodeType(node);
            lanes[lane].push(node);
        });

        const result: Node[] = [];

        // Layout evidence lanes
        ['SCENE', 'WITNESS', 'OTHER'].forEach((lane) => {
            const nodes = lanes[lane];
            const baseX = LANE_X[lane as keyof typeof LANE_X];

            nodes.forEach((node: any, index: number) => {
                result.push({
                    id: node.id,
                    type: 'evidence',
                    position: {
                        x: baseX,
                        y: EVIDENCE_START_Y + index * VERTICAL_SPACING
                    },
                    data: {
                        id: node.id,
                        label: node.id,
                        title: node.title,
                        nodeType: node.type || 'NOTE',
                        text: node.data?.text,
                        url: node.data?.url,
                        preview_url: node.data?.preview_url || evidenceUrls[node.id],
                        tags: node.data?.tags || [],
                        guilt_probability: node.data?.guilt_probability,
                        suspect_data: node.data?.suspect_data,
                        originalData: node,
                    },
                });
            });
        });

        // Layout suspects in bottom row, centered
        const suspects = lanes.SUSPECT;
        if (suspects.length > 0) {
            const totalWidth = (suspects.length - 1) * HORIZONTAL_SPACING;
            const startX = Math.max(100, (1100 - totalWidth) / 2);

            suspects.forEach((node: any, index: number) => {
                result.push({
                    id: node.id,
                    type: 'evidence',
                    position: {
                        x: startX + index * HORIZONTAL_SPACING,
                        y: SUSPECT_ROW_Y
                    },
                    data: {
                        id: node.id,
                        label: node.id,
                        title: node.title,
                        nodeType: 'SUSPECT',
                        text: node.data?.text,
                        url: node.data?.url,
                        preview_url: node.data?.preview_url,
                        tags: node.data?.tags || [],
                        guilt_probability: node.data?.guilt_probability,
                        suspect_data: node.data?.suspect_data,
                        originalData: node,
                    },
                });
            });
        }

        return result;
    }, [analysisData, evidenceUrls]);

    // Convert connections to React Flow edges with murder board styling
    const initialEdges: Edge[] = useMemo(() => {
        if (!analysisData?.connections) return [];

        return analysisData.connections.map((conn, index) => {
            const isSuspectEdge = conn.target_id?.startsWith('SUS') || conn.source_id?.startsWith('SUS');
            const relationship = conn.relationship || 'relates';

            const edgeColors: Record<string, string> = {
                supports: '#FF3D81',
                contradicts: '#EF4444',
                seen_with: '#F59E0B',
                relates: '#5EE7FF',
            };

            const edgeColor = edgeColors[relationship] || '#FF3D81';

            return {
                id: `edge-${index}`,
                source: conn.source_id,
                target: conn.target_id,
                label: conn.label,
                type: 'smoothstep',
                style: {
                    stroke: edgeColor,
                    strokeWidth: isSuspectEdge ? 3 : 2,
                    filter: `drop-shadow(0 0 8px ${edgeColor})`,
                },
                labelStyle: {
                    fill: '#fff',
                    fontSize: 10,
                    fontWeight: 600,
                },
                labelBgStyle: {
                    fill: '#1a1a2e',
                    fillOpacity: 0.95,
                },
                labelBgPadding: [8, 4] as [number, number],
                labelBgBorderRadius: 4,
                animated: true,
            };
        });
    }, [analysisData]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        onNodeClick(node.data);
    }, [onNodeClick]);

    // Count by type for legend
    const counts = useMemo(() => {
        const evidenceCount = initialNodes.filter(n => !n.id.startsWith('SUS')).length;
        const suspectCount = initialNodes.filter(n => n.id.startsWith('SUS')).length;
        return { evidence: evidenceCount, suspects: suspectCount };
    }, [initialNodes]);

    return (
        <div className="w-full h-full bg-noir-900 relative">
            {/* Murder Board Legend */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-6 px-4 py-2 bg-noir-800/80 rounded-lg backdrop-blur-sm text-xs">
                <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-laser-cyan"></span>
                    <span className="text-slate-300">Evidence ({counts.evidence})</span>
                </span>
                <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-laser-pink"></span>
                    <span className="text-slate-300">Suspects ({counts.suspects})</span>
                </span>
                <span className="flex items-center gap-2">
                    <span className="w-6 h-0.5 bg-gradient-to-r from-laser-cyan to-laser-pink"></span>
                    <span className="text-slate-300">Links</span>
                </span>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.3}
                maxZoom={2}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                }}
            >
                <Background
                    color="#1a1a2e"
                    gap={40}
                    size={1}
                />
                <Controls
                    className="!bg-noir-700 !border-noir-600 [&>button]:!bg-noir-800 [&>button]:!border-noir-600 [&>button:hover]:!bg-noir-700 [&>button>svg]:!fill-slate-400"
                />
                <MiniMap
                    className="!bg-noir-800"
                    nodeColor={(node) => {
                        return node.id.startsWith('SUS') ? '#FF3D81' : '#5EE7FF';
                    }}
                    maskColor="rgba(11, 11, 18, 0.8)"
                />
            </ReactFlow>
        </div>
    );
}
