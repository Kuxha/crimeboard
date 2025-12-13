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
        data: { url: string | null; text: string | null; tags: string[] };
        position: { x: number; y: number };
    }>;
    connections: Array<{
        source_id: string;
        target_id: string;
        label: string;
        confidence: number;
    }>;
    ui?: {
        theme?: { bg: string; nodeGlow: string; laser: string };
        physics?: { floatStrength: number; repel: number };
    };
}

interface EvidenceBoardProps {
    analysisData: AnalysisData;
    onNodeClick: (node: any) => void;
}

// Custom node component
function EvidenceNode({ data, selected }: NodeProps) {
    const nodeType = data.nodeType || 'NOTE';

    const typeColors: Record<string, string> = {
        PHOTO: '#10B981',
        STATEMENT: '#F59E0B',
        TIMELINE: '#8B5CF6',
        COMPOSITE: '#FF3D81',
        NOTE: '#6B7280',
    };

    const typeIcons: Record<string, string> = {
        PHOTO: '📷',
        STATEMENT: '📝',
        TIMELINE: '⏰',
        COMPOSITE: '🎨',
        NOTE: '📌',
    };

    return (
        <div
            className={`evidence-node type-${nodeType} ${selected ? 'ring-2 ring-laser-cyan' : ''}`}
            style={{ borderLeftColor: typeColors[nodeType] || typeColors.NOTE }}
        >
            <Handle type="target" position={Position.Top} className="!bg-laser-cyan !w-3 !h-3" />

            <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{typeIcons[nodeType] || '📌'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-noir-800 text-slate-400">
                    {data.label || data.id}
                </span>
            </div>

            <div className="text-sm font-medium text-white truncate max-w-[140px]">
                {data.title}
            </div>

            {data.tags && data.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {data.tags.slice(0, 3).map((tag: string, i: number) => (
                        <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 bg-laser-cyan/10 text-laser-cyan rounded"
                        >
                            {tag}
                        </span>
                    ))}
                    {data.tags.length > 3 && (
                        <span className="text-[10px] text-slate-500">+{data.tags.length - 3}</span>
                    )}
                </div>
            )}

            <Handle type="source" position={Position.Bottom} className="!bg-laser-pink !w-3 !h-3" />
        </div>
    );
}

const nodeTypes = {
    evidence: EvidenceNode,
};

export default function EvidenceBoard({ analysisData, onNodeClick }: EvidenceBoardProps) {
    // Convert analysis data to React Flow nodes
    const initialNodes: Node[] = useMemo(() => {
        if (!analysisData?.evidence_nodes) return [];

        return analysisData.evidence_nodes.map((node, index) => ({
            id: node.id,
            type: 'evidence',
            position: {
                x: node.position?.x || (index % 3) * 250 + 100,
                y: node.position?.y || Math.floor(index / 3) * 180 + 100
            },
            data: {
                label: node.id,
                title: node.title,
                nodeType: node.type,
                text: node.data?.text,
                url: node.data?.url,
                tags: node.data?.tags || [],
                originalData: node,
            },
        }));
    }, [analysisData]);

    // Convert connections to React Flow edges
    const initialEdges: Edge[] = useMemo(() => {
        if (!analysisData?.connections) return [];

        return analysisData.connections.map((conn, index) => ({
            id: `edge-${index}`,
            source: conn.source_id,
            target: conn.target_id,
            label: conn.label,
            style: {
                stroke: '#FF3D81',
                strokeWidth: 2,
                filter: 'drop-shadow(0 0 6px #FF3D81)',
            },
            labelStyle: {
                fill: '#fff',
                fontSize: 10,
                fontWeight: 500,
            },
            labelBgStyle: {
                fill: '#1a1a2e',
                fillOpacity: 0.9,
            },
            labelBgPadding: [6, 4] as [number, number],
            labelBgBorderRadius: 4,
            animated: true,
        }));
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
                    gap={20}
                    size={1}
                />
                <Controls
                    className="!bg-noir-700 !border-noir-600 [&>button]:!bg-noir-800 [&>button]:!border-noir-600 [&>button:hover]:!bg-noir-700 [&>button>svg]:!fill-slate-400"
                />
                <MiniMap
                    className="!bg-noir-800"
                    nodeColor={(node) => {
                        const typeColors: Record<string, string> = {
                            PHOTO: '#10B981',
                            STATEMENT: '#F59E0B',
                            TIMELINE: '#8B5CF6',
                            COMPOSITE: '#FF3D81',
                            NOTE: '#6B7280',
                        };
                        return typeColors[node.data?.nodeType as string] || '#5EE7FF';
                    }}
                    maskColor="rgba(11, 11, 18, 0.8)"
                />
            </ReactFlow>
        </div>
    );
}
