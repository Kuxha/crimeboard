'use client';

interface NodeData {
    label: string;
    title: string;
    nodeType: string;
    text: string | null;
    url: string | null;
    tags: string[];
    originalData?: any;
}

interface NodePanelProps {
    node: NodeData;
    onClose: () => void;
}

export default function NodePanel({ node, onClose }: NodePanelProps) {
    const typeColors: Record<string, string> = {
        PHOTO: 'text-green-400',
        STATEMENT: 'text-yellow-400',
        TIMELINE: 'text-purple-400',
        COMPOSITE: 'text-laser-pink',
        NOTE: 'text-slate-400',
    };

    const typeLabels: Record<string, string> = {
        PHOTO: 'Photographic Evidence',
        STATEMENT: 'Witness Statement',
        TIMELINE: 'Timeline Event',
        COMPOSITE: 'Composite Sketch',
        NOTE: 'Investigation Note',
    };

    return (
        <div className="w-96 flex-shrink-0 bg-noir-800 border-l border-noir-700 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-noir-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${typeColors[node.nodeType] || 'text-slate-400'}`}>
                        {node.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-noir-700 rounded-full text-slate-400">
                        {typeLabels[node.nodeType] || 'Evidence'}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-noir-700 text-slate-400 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Title */}
                <div>
                    <h2 className="text-lg font-semibold text-white">{node.title}</h2>
                </div>

                {/* Image Preview (for PHOTO type) */}
                {node.nodeType === 'PHOTO' && node.url && (
                    <div className="rounded-lg overflow-hidden border border-noir-700">
                        <img
                            src={node.url}
                            alt={node.title}
                            className="w-full h-48 object-cover"
                        />
                    </div>
                )}

                {/* Placeholder for photos without URL */}
                {node.nodeType === 'PHOTO' && !node.url && (
                    <div className="h-48 rounded-lg bg-noir-700 flex items-center justify-center">
                        <div className="text-center text-slate-500">
                            <div className="text-3xl mb-2">📷</div>
                            <p className="text-sm">Image preview unavailable</p>
                        </div>
                    </div>
                )}

                {/* Text Content */}
                {node.text && (
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">Content</h3>
                        <div className="p-3 bg-noir-900 rounded-lg text-sm text-slate-300 whitespace-pre-wrap">
                            {node.text}
                        </div>
                    </div>
                )}

                {/* Tags */}
                {node.tags && node.tags.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                            {node.tags.map((tag, i) => (
                                <span
                                    key={i}
                                    className="px-2 py-1 bg-laser-cyan/10 text-laser-cyan text-xs rounded-lg"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Composite Prompt (for COMPOSITE type) */}
                {node.nodeType === 'COMPOSITE' && node.originalData?.data?.composite_prompt && (
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">Composite Prompt</h3>
                        <div className="p-3 bg-noir-900 rounded-lg text-sm text-slate-300 italic">
                            {node.originalData.data.composite_prompt}
                        </div>
                    </div>
                )}

                {/* Evidence ID */}
                <div className="pt-4 border-t border-noir-700">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Evidence ID</span>
                        <code className="font-mono bg-noir-900 px-2 py-1 rounded">{node.label}</code>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 p-4 border-t border-noir-700 space-y-2">
                {node.url && (
                    <a
                        href={node.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-2 text-center bg-laser-cyan/10 text-laser-cyan rounded-lg text-sm hover:bg-laser-cyan/20 transition-colors"
                    >
                        View Original File
                    </a>
                )}
                <button className="w-full py-2 text-center border border-noir-600 text-slate-400 rounded-lg text-sm hover:bg-noir-700 transition-colors">
                    Add Note
                </button>
            </div>
        </div>
    );
}
