'use client';

import { useState, useCallback } from 'react';

interface UploadModalProps {
    caseId: string;
    onClose: () => void;
    onComplete: () => void;
}

interface FileStatus {
    file: File;
    status: 'pending' | 'uploading' | 'done' | 'error';
    error?: string;
}

export default function UploadModal({ caseId, onClose, onComplete }: UploadModalProps) {
    const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFileStatuses(prev => [
            ...prev,
            ...droppedFiles.map(file => ({ file, status: 'pending' as const }))
        ]);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFileStatuses(prev => [
                ...prev,
                ...selectedFiles.map(file => ({ file, status: 'pending' as const }))
            ]);
        }
    };

    const removeFile = (index: number) => {
        setFileStatuses(prev => prev.filter((_, i) => i !== index));
    };

    const getKind = (file: File): string => {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type === 'application/pdf') return 'pdf';
        if (file.type.startsWith('text/') || file.name.endsWith('.txt')) return 'text';
        return 'document';
    };

    async function uploadSingleFile(fileStatus: FileStatus, index: number): Promise<boolean> {
        const { file } = fileStatus;

        try {
            // Update status to uploading
            setFileStatuses(prev => prev.map((fs, i) =>
                i === index ? { ...fs, status: 'uploading' } : fs
            ));

            // Step 1: Get presigned URL
            const presignRes = await fetch(`/api/cases/${caseId}/presign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type || 'application/octet-stream'
                }),
            });

            if (!presignRes.ok) {
                throw new Error('Failed to get upload URL');
            }

            const { key, uploadUrl } = await presignRes.json();

            // Step 2: PUT directly to Spaces (NO base64, raw file bytes)
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file, // Raw file, not base64
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                },
            });

            if (!uploadRes.ok) {
                throw new Error('Failed to upload to storage');
            }

            // Step 3: Register in database
            const registerRes = await fetch(`/api/cases/${caseId}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: [{
                        key,
                        filename: file.name,
                        kind: getKind(file),
                        contentType: file.type || 'application/octet-stream',
                        sizeBytes: file.size
                    }]
                }),
            });

            if (!registerRes.ok) {
                throw new Error('Failed to register file');
            }

            // Update status to done
            setFileStatuses(prev => prev.map((fs, i) =>
                i === index ? { ...fs, status: 'done' } : fs
            ));

            return true;
        } catch (error) {
            // Update status to error
            setFileStatuses(prev => prev.map((fs, i) =>
                i === index ? { ...fs, status: 'error', error: (error as Error).message } : fs
            ));
            return false;
        }
    }

    async function handleUpload() {
        if (fileStatuses.length === 0) return;

        setUploading(true);

        // Upload all files concurrently
        const results = await Promise.all(
            fileStatuses.map((fs, index) => uploadSingleFile(fs, index))
        );

        const allSuccess = results.every(r => r);

        setUploading(false);

        if (allSuccess) {
            setTimeout(() => {
                onComplete();
            }, 500);
        }
    }

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) return '🖼️';
        if (file.type === 'application/pdf') return '📄';
        if (file.type.startsWith('text/')) return '📝';
        return '📎';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return '⏳';
            case 'uploading': return '⬆️';
            case 'done': return '✅';
            case 'error': return '❌';
            default: return '⏳';
        }
    };

    const pendingCount = fileStatuses.filter(f => f.status === 'pending').length;
    const doneCount = fileStatuses.filter(f => f.status === 'done').length;

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
                        <p className="text-sm text-slate-500">Images, PDFs, text documents • Multi-select supported</p>
                        <input
                            type="file"
                            multiple
                            accept="image/*,.pdf,.txt,.doc,.docx"
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>

                    {/* File List */}
                    {fileStatuses.length > 0 && (
                        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                            {fileStatuses.map((fs, index) => (
                                <div
                                    key={index}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${fs.status === 'error' ? 'bg-red-900/30' :
                                            fs.status === 'done' ? 'bg-green-900/30' : 'bg-noir-800'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <span className="text-xl flex-shrink-0">{getFileIcon(fs.file)}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-white truncate">{fs.file.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {(fs.file.size / 1024).toFixed(1)} KB • {getKind(fs.file)}
                                                {fs.error && <span className="text-red-400 ml-2">{fs.error}</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{getStatusIcon(fs.status)}</span>
                                        {!uploading && fs.status === 'pending' && (
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Progress Summary */}
                    {uploading && (
                        <div className="mt-4 text-center text-sm text-slate-400">
                            Uploading {doneCount}/{fileStatuses.length} files...
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
                        disabled={uploading || pendingCount === 0}
                        className="flex-1 py-2.5 bg-laser-cyan rounded-lg text-noir-900 font-medium hover:bg-laser-cyan/90 transition-colors disabled:opacity-50"
                    >
                        {uploading ? `Uploading ${doneCount}/${fileStatuses.length}...` : `Upload ${fileStatuses.length} File${fileStatuses.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
