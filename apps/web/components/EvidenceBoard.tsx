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

// Evidence node component
function EvidenceNode({ data, selected }: NodeProps) {
    const nodeType = data.nodeType || 'NOTE';

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
    const guiltProbability = data.guilt_probability;

    return (
        <div
            className={`evidence-node type-${nodeType} ${selected ? 'ring-2 ring-laser-cyan' : ''}`}
            style={{
                borderLeftColor: typeColors[nodeType] || typeColors.NOTE,
                minWidth: isSuspect ? '200px' : '170px',
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
                    {data.label || data.id}
                </span>
                {isSuspect && guiltProbability !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${guiltProbability >= 70 ? 'bg-red-500/40 text-red-300' :
                            guiltProbability >= 40 ? 'bg-yellow-500/40 text-yellow-300' :
                                'bg-slate-500/40 text-slate-300'
                        }`}>
                        {guiltProbability}%
                    </span>
                )}
            </div>

            <div className={`text-sm font-medium truncate max-w-[180px] ${isSuspect ? 'text-laser-pink' : 'text-white'
                }`}>
                {data.title}
            </div>

            {/* Image preview for photos */}
            {nodeType === 'PHOTO' && data.preview_url && (
                <div className="mt-2 rounded overflow-hidden border border-noir-600">
                    <img
                        src={data.preview_url}
                        alt={data.title}
                        className="w-full h-20 object-cover"
                    />
                </div>
            )}

            {data.tags && data.tags.length > 0 && !isSuspect && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {data.tags.slice(0, 3).map((tag: string, i: number) => (
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
            {isSuspect && guiltProbability !== undefined && (
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

    // Separate evidence and suspect nodes, apply murder board layout
    const initialNodes: Node[] = useMemo(() => {
        if (!analysisData?.evidence_nodes) return [];

        const allNodes = analysisData.evidence_nodes;

        // Separate evidence (EVID-*) and suspects (SUS-*)
        const evidenceNodes = allNodes.filter(n => n.id.startsWith('EVID') || !n.id.startsWith('SUS'));
        const suspectNodes = allNodes.filter(n => n.id.startsWith('SUS') || n.type === 'SUSPECT');

        // Layout: Evidence on top row(s), suspects on bottom
        const BOARD_WIDTH = 800;
        const EVIDENCE_Y = 60;
        const SUSPECT_Y = 350;
        const NODE_WIDTH = 200;
        const NODE_GAP = 30;

        // Position evidence nodes in top row(s)
        const positionedEvidence = evidenceNodes.map((node, index) => {
            const nodesPerRow = Math.floor(BOARD_WIDTH / (NODE_WIDTH + NODE_GAP));
            const row = Math.floor(index / nodesPerRow);
            const col = index % nodesPerRow;
            const totalInRow = Math.min(nodesPerRow, evidenceNodes.length - row * nodesPerRow);
            const rowWidth = totalInRow * (NODE_WIDTH + NODE_GAP) - NODE_GAP;
            const startX = (BOARD_WIDTH - rowWidth) / 2;

            return {
                id: node.id,
                type: 'evidence',
                position: {
                    x: startX + col * (NODE_WIDTH + NODE_GAP),
                    y: EVIDENCE_Y + row * 140
                },
                data: {
                    id: node.id,
                    label: node.id,
                    title: node.title,
                    nodeType: node.type === 'SUSPECT' ? 'SUSPECT' : (node.type || 'NOTE'),
                    text: node.data?.text,
                    url: node.data?.url,
                    preview_url: node.data?.preview_url || evidenceUrls[node.id],
                    tags: node.data?.tags || [],
                    guilt_probability: node.data?.guilt_probability,
                    suspect_data: node.data?.suspect_data,
                    originalData: node,
                },
            };
        });

        // Position suspect nodes in bottom row, centered
        const positionedSuspects = suspectNodes.map((node, index) => {
            const totalSuspects = suspectNodes.length;
            const suspectRowWidth = totalSuspects * (NODE_WIDTH + NODE_GAP) - NODE_GAP;
            const startX = (BOARD_WIDTH - suspectRowWidth) / 2;

            return {
                id: node.id,
                type: 'evidence',
                position: {
                    x: startX + index * (NODE_WIDTH + NODE_GAP),
                    y: SUSPECT_Y
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
            };
        });

        return [...positionedEvidence, ...positionedSuspects];
    }, [analysisData, evidenceUrls]);

    // Convert connections to React Flow edges with murder board styling
    const initialEdges: Edge[] = useMemo(() => {
        if (!analysisData?.connections) return [];

        return analysisData.connections.map((conn, index) => {
            const isSuspectEdge = conn.target_id?.startsWith('SUS') || conn.source_id?.startsWith('SUS');
            const relationship = conn.relationship || 'relates';

            const edgeColors: Record<string, string> = {
                supports: '#FF3D81',      // Pink laser
                contradicts: '#EF4444',   // Red
                seen_with: '#F59E0B',     // Yellow
                relates: '#5EE7FF',       // Cyan laser
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

    return (
        <div className="w-full h-full bg-noir-900">
            {/* Murder Board Header */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-laser-cyan/50"></span> Evidence (Top)
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-laser-pink/50"></span> Suspects (Bottom)
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-6 h-0.5 bg-laser-pink"></span> Links
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
                fitViewOptions={{ padding: 0.3 }}
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
                        return node.data?.nodeType === 'SUSPECT' ? '#FF3D81' : '#5EE7FF';
                    }}
                    maskColor="rgba(11, 11, 18, 0.8)"
                />
            </ReactFlow>
        </div>
    );
}
