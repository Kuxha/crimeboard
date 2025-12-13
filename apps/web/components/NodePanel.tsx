'use client';

interface SuspectData {
    suspect_id: string;
    display_name: string;
    guilt_probability: number;
    why_suspected: Array<{ reason: string; evidence_ids: string[] }>;
    key_attributes: {
        description?: string;
        vehicle?: string;
        last_seen?: string;
    };
    relationships?: Array<{
        target_suspect_id: string;
        label: string;
        evidence_ids: string[];
    }>;
    recommended_next_action?: string;
}

interface NodeData {
    id: string;
    label: string;
    title: string;
    nodeType: string;
    text: string | null;
    url: string | null;
    preview_url?: string | null;
    tags: string[];
    guilt_probability?: number;
    suspect_data?: SuspectData;
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
        PDF: 'text-blue-400',
        SUSPECT: 'text-laser-pink',
    };

    const typeLabels: Record<string, string> = {
        PHOTO: 'Photographic Evidence',
        STATEMENT: 'Witness Statement',
        TIMELINE: 'Timeline Event',
        COMPOSITE: 'Composite Sketch',
        NOTE: 'Investigation Note',
        PDF: 'Document',
        SUSPECT: 'Suspect Profile',
    };

    const isSuspect = node.nodeType === 'SUSPECT';
    const suspectData = node.suspect_data;
    const guiltProbability = node.guilt_probability || suspectData?.guilt_probability;

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
                    {isSuspect && guiltProbability !== undefined && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${guiltProbability >= 70 ? 'bg-red-500/30 text-red-400' :
                                guiltProbability >= 40 ? 'bg-yellow-500/30 text-yellow-400' :
                                    'bg-slate-500/30 text-slate-400'
                            }`}>
                            {guiltProbability}% Guilt
                        </span>
                    )}
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

                {/* Guilt Probability Bar (for suspects) */}
                {isSuspect && guiltProbability !== undefined && (
                    <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-400">Guilt Probability</span>
                            <span className={`font-bold ${guiltProbability >= 70 ? 'text-red-400' :
                                    guiltProbability >= 40 ? 'text-yellow-400' : 'text-slate-400'
                                }`}>{guiltProbability}%</span>
                        </div>
                        <div className="h-3 bg-noir-900 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${guiltProbability >= 70 ? 'bg-red-500' :
                                        guiltProbability >= 40 ? 'bg-yellow-500' : 'bg-slate-500'
                                    }`}
                                style={{ width: `${guiltProbability}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Image Preview (for PHOTO type) */}
                {node.nodeType === 'PHOTO' && node.preview_url && (
                    <div className="rounded-lg overflow-hidden border border-noir-700">
                        <img
                            src={node.preview_url}
                            alt={node.title}
                            className="w-full h-48 object-cover"
                        />
                    </div>
                )}

                {/* Placeholder for photos without URL */}
                {node.nodeType === 'PHOTO' && !node.preview_url && !node.url && (
                    <div className="h-48 rounded-lg bg-noir-700 flex items-center justify-center">
                        <div className="text-center text-slate-500">
                            <div className="text-3xl mb-2">📷</div>
                            <p className="text-sm">Image preview unavailable</p>
                        </div>
                    </div>
                )}

                {/* PDF link */}
                {node.nodeType === 'PDF' && node.preview_url && (
                    <a
                        href={node.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 bg-noir-700 rounded-lg text-center hover:bg-noir-600 transition-colors"
                    >
                        <div className="text-3xl mb-2">📄</div>
                        <p className="text-laser-cyan">Open PDF in New Tab</p>
                    </a>
                )}

                {/* Why Suspected (for suspects) */}
                {isSuspect && suspectData?.why_suspected && suspectData.why_suspected.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">Why Suspected</h3>
                        <div className="space-y-2">
                            {suspectData.why_suspected.map((reason, i) => (
                                <div key={i} className="p-3 bg-noir-900 rounded-lg">
                                    <p className="text-sm text-white">{reason.reason}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {reason.evidence_ids.map((eid, j) => (
                                            <span key={j} className="text-[10px] px-2 py-0.5 bg-laser-cyan/20 text-laser-cyan rounded">
                                                {eid}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Key Attributes (for suspects) */}
                {isSuspect && suspectData?.key_attributes && (
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">Key Attributes</h3>
                        <div className="p-3 bg-noir-900 rounded-lg space-y-2 text-sm">
                            {suspectData.key_attributes.description && (
                                <div><span className="text-slate-500">Description:</span> <span className="text-white">{suspectData.key_attributes.description}</span></div>
                            )}
                            {suspectData.key_attributes.vehicle && (
                                <div><span className="text-slate-500">Vehicle:</span> <span className="text-white">{suspectData.key_attributes.vehicle}</span></div>
                            )}
                            {suspectData.key_attributes.last_seen && (
                                <div><span className="text-slate-500">Last Seen:</span> <span className="text-white">{suspectData.key_attributes.last_seen}</span></div>
                            )}
                        </div>
                    </div>
                )}

                {/* Relationships (for suspects) */}
                {isSuspect && suspectData?.relationships && suspectData.relationships.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">Relationships</h3>
                        <div className="space-y-2">
                            {suspectData.relationships.map((rel, i) => (
                                <div key={i} className="p-3 bg-noir-900 rounded-lg flex items-center justify-between">
                                    <div>
                                        <span className="text-laser-pink">{rel.target_suspect_id}</span>
                                        <span className="text-slate-400 mx-2">→</span>
                                        <span className="text-white">{rel.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommended Next Action (for suspects) */}
                {isSuspect && suspectData?.recommended_next_action && (
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-2">Recommended Action</h3>
                        <div className="p-3 bg-laser-cyan/10 border border-laser-cyan/30 rounded-lg text-sm text-white">
                            {suspectData.recommended_next_action}
                        </div>
                    </div>
                )}

                {/* Text Content (for non-suspects) */}
                {!isSuspect && node.text && (
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

                {/* Evidence ID */}
                <div className="pt-4 border-t border-noir-700">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{isSuspect ? 'Suspect ID' : 'Evidence ID'}</span>
                        <code className="font-mono bg-noir-900 px-2 py-1 rounded">{node.label}</code>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 p-4 border-t border-noir-700 space-y-2">
                {node.preview_url && (
                    <a
                        href={node.preview_url}
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
