'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import EvidenceBoard from '@/components/EvidenceBoard';
import NodePanel from '@/components/NodePanel';
import UploadModal from '@/components/UploadModal';

interface Case {
    id: string;
    title: string;
    status: string;
    analysis_json: any;
    created_at: string;
}

interface Evidence {
    id: string;
    kind: string;
    filename: string;
    spaces_key: string;
    preview_url?: string;
    created_at: string;
}

export default function CasePage() {
    const params = useParams();
    const caseId = params.id as string;

    const [caseData, setCaseData] = useState<Case | null>(null);
    const [evidence, setEvidence] = useState<Evidence[]>([]);
    const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [generating, setGenerating] = useState(false);
    const [analysisStats, setAnalysisStats] = useState<any>(null);

    useEffect(() => {
        fetchCase();
        fetchEvidence();
    }, [caseId]);

    async function fetchCase() {
        try {
            const res = await fetch(`/api/cases/${caseId}`);
            if (res.ok) {
                const data = await res.json();
                setCaseData(data.case);
            }
        } catch (error) {
            console.error('Failed to fetch case:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchEvidence() {
        try {
            const res = await fetch(`/api/cases/${caseId}/evidence`);
            if (res.ok) {
                const data = await res.json();
                const evidenceItems = data.evidence || [];
                setEvidence(evidenceItems);

                // Build URL map for board
                const urlMap: Record<string, string> = {};
                evidenceItems.forEach((e: Evidence, i: number) => {
                    if (e.preview_url) {
                        urlMap[`EVID-${String(i + 1).padStart(2, '0')}`] = e.preview_url;
                    }
                });
                setEvidenceUrls(urlMap);
            }
        } catch (error) {
            console.error('Failed to fetch evidence:', error);
        }
    }

    async function handleAnalyze() {
        setAnalyzing(true);
        setAnalysisStats(null);
        try {
            const res = await fetch(`/api/cases/${caseId}/analyze`, {
                method: 'POST'
            });

            if (res.ok) {
                const data = await res.json();
                setCaseData(prev => prev ? { ...prev, analysis_json: data.analysis, status: 'analyzed' } : prev);
                setAnalysisStats(data.stats);
            } else {
                const error = await res.json();
                alert(`Analysis failed: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to analyze:', error);
            alert('Analysis failed. Check console for details.');
        } finally {
            setAnalyzing(false);
        }
    }

    async function handleCloseCaseFile() {
        setGenerating(true);
        try {
            const res = await fetch(`/api/cases/${caseId}/close`, {
                method: 'POST'
            });

            if (res.ok) {
                const data = await res.json();
                if (data.pdf_url) {
                    window.open(data.pdf_url, '_blank');
                }
            }
        } catch (error) {
            console.error('Failed to generate case file:', error);
        } finally {
            setGenerating(false);
        }
    }

    function handleUploadComplete() {
        setShowUpload(false);
        fetchEvidence();
    }

    const handleNodeClick = useCallback((node: any) => {
        setSelectedNode(node);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!caseData) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="text-center">
                    <h2 className="text-xl text-slate-400">Case not found</h2>
                    <a href="/" className="text-laser-cyan hover:underline mt-4 inline-block">
                        ← Back to Cases
                    </a>
                </div>
            </div>
        );
    }

    const analysisData = caseData.analysis_json;
    const suspects = analysisData?.suspects || [];

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Case Header */}
            <div className="flex-shrink-0 px-4 py-3 bg-noir-800/50 border-b border-noir-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <a href="/" className="text-slate-400 hover:text-laser-cyan transition-colors">
                        ← Back
                    </a>
                    <div>
                        <h1 className="text-xl font-semibold text-white">{caseData.title}</h1>
                        <p className="text-sm text-slate-500">
                            {evidence.length} evidence items
                            {suspects.length > 0 && ` • ${suspects.length} suspects`}
                            {analysisStats && ` • ${analysisStats.nodes} nodes, ${analysisStats.connections} connections`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowUpload(true)}
                        className="px-4 py-2 border border-laser-cyan/30 rounded-lg text-laser-cyan text-sm hover:bg-laser-cyan/10 transition-colors"
                    >
                        + Upload Evidence
                    </button>

                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing || evidence.length === 0}
                        className="px-4 py-2 bg-gradient-to-r from-laser-cyan to-laser-pink rounded-lg text-noir-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {analyzing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-noir-900/30 border-t-noir-900 rounded-full animate-spin"></div>
                                Analyzing (7 agents)...
                            </>
                        ) : (
                            '🔍 Analyze'
                        )}
                    </button>

                    {analysisData && (
                        <button
                            onClick={handleCloseCaseFile}
                            disabled={generating}
                            className="px-4 py-2 bg-laser-pink rounded-lg text-white text-sm font-medium hover:bg-laser-pink/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {generating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Generating...
                                </>
                            ) : (
                                '📄 Close Case File'
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Suspects Summary Bar (when analysis exists) */}
            {suspects.length > 0 && (
                <div className="flex-shrink-0 px-4 py-2 bg-noir-800/30 border-b border-noir-700 flex items-center gap-4 overflow-x-auto">
                    <span className="text-sm text-slate-500 flex-shrink-0">Suspects:</span>
                    {suspects.map((s: any) => (
                        <div
                            key={s.suspect_id}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-noir-700 transition-colors ${s.guilt_probability >= 70 ? 'bg-red-900/30' :
                                    s.guilt_probability >= 40 ? 'bg-yellow-900/30' : 'bg-noir-700'
                                }`}
                            onClick={() => setSelectedNode({
                                id: s.suspect_id,
                                label: s.suspect_id,
                                title: s.display_name,
                                nodeType: 'SUSPECT',
                                guilt_probability: s.guilt_probability,
                                suspect_data: s,
                                tags: [],
                                text: s.key_attributes?.description
                            })}
                        >
                            <span className="text-sm text-white">{s.display_name}</span>
                            <span className={`text-xs font-bold ${s.guilt_probability >= 70 ? 'text-red-400' :
                                    s.guilt_probability >= 40 ? 'text-yellow-400' : 'text-slate-400'
                                }`}>
                                {s.guilt_probability}%
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Evidence Board */}
                <div className="flex-1 relative">
                    {analysisData ? (
                        <EvidenceBoard
                            analysisData={analysisData}
                            evidenceUrls={evidenceUrls}
                            onNodeClick={handleNodeClick}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center max-w-md">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-noir-700 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-laser-cyan/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-medium text-white mb-2">Evidence Board</h2>
                                <p className="text-slate-400 mb-6">
                                    {evidence.length === 0
                                        ? 'Upload evidence files to begin analysis'
                                        : 'Click "Analyze" to run 7 AI agents on your evidence'}
                                </p>
                                {evidence.length === 0 ? (
                                    <button
                                        onClick={() => setShowUpload(true)}
                                        className="px-6 py-3 bg-laser-cyan rounded-lg text-noir-900 font-medium hover:bg-laser-cyan/90 transition-colors"
                                    >
                                        Upload Evidence
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={analyzing}
                                        className="px-6 py-3 bg-gradient-to-r from-laser-cyan to-laser-pink rounded-lg text-noir-900 font-medium"
                                    >
                                        🔍 Analyze Evidence
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Node Detail Panel */}
                {selectedNode && (
                    <NodePanel
                        node={selectedNode}
                        onClose={() => setSelectedNode(null)}
                    />
                )}
            </div>

            {/* Evidence List Footer (when no analysis yet) */}
            {!analysisData && evidence.length > 0 && (
                <div className="flex-shrink-0 px-4 py-3 bg-noir-800/50 border-t border-noir-700">
                    <div className="flex items-center gap-4 overflow-x-auto">
                        <span className="text-sm text-slate-500 flex-shrink-0">Evidence:</span>
                        {evidence.map(e => (
                            <div
                                key={e.id}
                                className="flex-shrink-0 px-3 py-1.5 bg-noir-700 rounded-lg text-sm flex items-center gap-2"
                            >
                                <span className={`w-2 h-2 rounded-full ${e.kind === 'image' ? 'bg-green-400' :
                                        e.kind === 'pdf' ? 'bg-blue-400' :
                                            e.kind === 'text' ? 'bg-yellow-400' : 'bg-slate-400'
                                    }`}></span>
                                {e.filename}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUpload && (
                <UploadModal
                    caseId={caseId}
                    onClose={() => setShowUpload(false)}
                    onComplete={handleUploadComplete}
                />
            )}
        </div>
    );
}
