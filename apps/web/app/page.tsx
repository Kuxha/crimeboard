'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Case {
    id: string;
    title: string;
    status: string;
    created_at: string;
    evidence_count?: number;
}

export default function HomePage() {
    const [cases, setCases] = useState<Case[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewCase, setShowNewCase] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchCases();
    }, []);

    async function fetchCases() {
        try {
            const res = await fetch('/api/cases');
            if (res.ok) {
                const data = await res.json();
                setCases(data.cases || []);
            }
        } catch (error) {
            console.error('Failed to fetch cases:', error);
        } finally {
            setLoading(false);
        }
    }

    async function createCase() {
        if (!newTitle.trim()) return;

        setCreating(true);
        try {
            const res = await fetch('/api/cases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle })
            });

            if (res.ok) {
                const data = await res.json();
                setCases(prev => [data.case, ...prev]);
                setNewTitle('');
                setShowNewCase(false);
            }
        } catch (error) {
            console.error('Failed to create case:', error);
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Hero Section */}
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-laser-cyan via-laser-purple to-laser-pink bg-clip-text text-transparent">
                        Gen AI Murder Board
                    </span>
                </h1>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                    Upload evidence. 7 AI agents build a murder board with suspects.
                    One click generates a courtroom-ready Case File PDF.
                </p>

                <div className="mt-8 flex items-center justify-center gap-4">
                    <button
                        onClick={() => setShowNewCase(true)}
                        className="btn-glow px-6 py-3 bg-gradient-to-r from-laser-cyan to-laser-pink rounded-lg text-noir-900 font-semibold hover:shadow-neon-cyan transition-all"
                    >
                        + Create New Case
                    </button>
                </div>
            </div>

            {/* New Case Modal */}
            {showNewCase && (
                <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
                    <div className="card-glow bg-noir-700 p-6 w-full max-w-md mx-4">
                        <h2 className="text-xl font-semibold text-laser-cyan mb-4">Create New Case</h2>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Case Title..."
                            className="w-full px-4 py-3 bg-noir-800 border border-laser-cyan/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-laser-cyan"
                            autoFocus
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setShowNewCase(false)}
                                className="flex-1 px-4 py-2 border border-slate-600 rounded-lg text-slate-400 hover:bg-noir-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createCase}
                                disabled={creating || !newTitle.trim()}
                                className="flex-1 px-4 py-2 bg-laser-cyan rounded-lg text-noir-900 font-medium hover:bg-laser-cyan/90 transition-colors disabled:opacity-50"
                            >
                                {creating ? 'Creating...' : 'Create Case'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cases Grid */}
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-6">Your Cases</h2>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="spinner"></div>
                    </div>
                ) : cases.length === 0 ? (
                    <div className="text-center py-12 card-glow">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-noir-800 flex items-center justify-center">
                            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-slate-400 mb-4">No cases yet. Create your first case to get started.</p>
                        <button
                            onClick={() => setShowNewCase(true)}
                            className="text-laser-cyan hover:underline"
                        >
                            + Create New Case
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {cases.map((c) => (
                            <Link key={c.id} href={`/case/${c.id}`}>
                                <div className="card-glow p-5 cursor-pointer group">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-semibold text-white group-hover:text-laser-cyan transition-colors truncate">
                                            {c.title}
                                        </h3>
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${c.status === 'analyzed'
                                            ? 'bg-green-500/20 text-green-400'
                                            : c.status === 'analyzing'
                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                : 'bg-slate-500/20 text-slate-400'
                                            }`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        Created {new Date(c.created_at).toLocaleDateString()}
                                    </p>
                                    {c.evidence_count !== undefined && (
                                        <p className="text-sm text-slate-500 mt-1">
                                            {c.evidence_count} evidence items
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* DO Products Showcase */}
            <div className="mt-16 pt-8 border-t border-noir-700">
                <h3 className="text-center text-sm text-slate-500 mb-6">Powered by DigitalOcean</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs">
                    <div className="p-4 rounded-lg bg-noir-800/50">
                        <div className="text-laser-cyan font-medium">Gradient™ AI Platform</div>
                        <div className="text-slate-500 mt-1">Multi-Agent Routing</div>
                    </div>
                    <div className="p-4 rounded-lg bg-noir-800/50">
                        <div className="text-laser-cyan font-medium">Functions</div>
                        <div className="text-slate-500 mt-1">Serverless Processing</div>
                    </div>
                    <div className="p-4 rounded-lg bg-noir-800/50">
                        <div className="text-laser-cyan font-medium">Spaces</div>
                        <div className="text-slate-500 mt-1">Object Storage</div>
                    </div>
                    <div className="p-4 rounded-lg bg-noir-800/50">
                        <div className="text-laser-cyan font-medium">Managed PostgreSQL</div>
                        <div className="text-slate-500 mt-1">Database</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
