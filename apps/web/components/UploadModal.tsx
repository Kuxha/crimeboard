'use client';

import { useState, useCallback } from 'react';

interface UploadModalProps {
    caseId: string;
    onClose: () => void;
    onComplete: () => void;
}

export default function UploadModal({ caseId, onClose, onComplete }: UploadModalProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentFile, setCurrentFile] = useState('');
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(prev => [...prev, ...droppedFiles]);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    async function handleUpload() {
        if (files.length === 0) return;

        setUploading(true);
        setProgress(0);

        const uploadedFiles: Array<{ filename: string; spaces_key: string; mime_type: string }> = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setCurrentFile(file.name);
                setProgress(Math.round((i / files.length) * 100));

                // Step 1: Get presigned URL
                const presignRes = await fetch(`/api/cases/${caseId}/presign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: file.name,
                        contentType: file.type
                    }),
                });

                if (!presignRes.ok) {
                    throw new Error(`Failed to get upload URL for ${file.name}`);
                }

                const { key, uploadUrl } = await presignRes.json();

                // Step 2: Upload directly to Spaces using presigned URL
                const uploadRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: {
                        'Content-Type': file.type || 'application/octet-stream',
                    },
                });

                if (!uploadRes.ok) {
                    throw new Error(`Failed to upload ${file.name} to storage`);
                }

                uploadedFiles.push({
                    filename: file.name,
                    spaces_key: key,
                    mime_type: file.type,
                });
            }

            // Step 3: Register all files in database
            const registerRes = await fetch(`/api/cases/${caseId}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: uploadedFiles }),
            });

            if (!registerRes.ok) {
                throw new Error('Failed to register uploaded files');
            }

            setProgress(100);
            setCurrentFile('');

            setTimeout(() => {
                onComplete();
            }, 500);
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setUploading(false);
        }
    }

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return '🖼️';
        if (type === 'application/pdf') return '📄';
        if (type.startsWith('text/')) return '📝';
        return '📎';
    };

    return (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
            <div className="card-glow bg-noir-700 w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-noir-600">
                    <h2 className="text-lg font-semibold text-white">Upload Evidence</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-noir-600 text-slate-400"
                        disabled={uploading}
                    >
                        ✕
                    </button>
                </div>

                <div className="p-5">
                    {/* Drop Zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver
                                ? 'border-laser-cyan bg-laser-cyan/10'
                                : 'border-noir-600 hover:border-noir-500'
                            }`}
                    >
                        <div className="text-4xl mb-3">📁</div>
                        <p className="text-white mb-1">Drop files here or click to browse</p>
                        <p className="text-sm text-slate-500">Photos, PDFs, text documents</p>
                        <input
                            type="file"
                            multiple
                            accept="image/*,.pdf,.txt,.doc,.docx"
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between px-3 py-2 bg-noir-800 rounded-lg"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-xl flex-shrink-0">{getFileIcon(file.type)}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm text-white truncate">{file.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                    {!uploading && (
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Progress Bar */}
                    {uploading && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-slate-400 truncate max-w-[200px]">
                                    {currentFile ? `Uploading: ${currentFile}` : 'Registering...'}
                                </span>
                                <span className="text-laser-cyan">{progress}%</span>
                            </div>
                            <div className="h-2 bg-noir-900 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-laser-cyan to-laser-pink transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-5 py-4 border-t border-noir-600">
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="flex-1 py-2.5 border border-noir-600 rounded-lg text-slate-400 hover:bg-noir-600 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={uploading || files.length === 0}
                        className="flex-1 py-2.5 bg-laser-cyan rounded-lg text-noir-900 font-medium hover:bg-laser-cyan/90 transition-colors disabled:opacity-50"
                    >
                        {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
