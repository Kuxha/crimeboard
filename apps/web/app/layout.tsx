import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'CrimeBoard | Gen AI Murder Board',
    description: 'Upload evidence. AI agents auto-build a murder board with suspects. One click generates a courtroom-ready Case File PDF.',
    keywords: 'evidence, investigation, crime board, AI analysis, murder board',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-noir-900 text-slate-200 min-h-screen`}>
                {/* Top navigation bar */}
                <header className="fixed top-0 left-0 right-0 z-50 bg-noir-800/90 backdrop-blur-sm border-b border-laser-cyan/20">
                    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                        <a href="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-laser-cyan to-laser-pink flex items-center justify-center">
                                <svg className="w-6 h-6 text-noir-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-laser-cyan to-laser-pink bg-clip-text text-transparent">
                                    CrimeBoard
                                </h1>
                                <p className="text-xs text-slate-400">Gen AI Murder Board</p>
                            </div>
                        </a>

                        <nav className="flex items-center gap-4">
                            <a
                                href="/"
                                className="px-4 py-2 text-sm text-slate-300 hover:text-laser-cyan transition-colors"
                            >
                                Cases
                            </a>
                            <a
                                href="/"
                                className="btn-glow px-4 py-2 bg-laser-cyan/10 border border-laser-cyan/30 rounded-lg text-laser-cyan text-sm font-medium hover:bg-laser-cyan/20 transition-colors"
                            >
                                + New Case
                            </a>
                        </nav>
                    </div>
                </header>

                {/* Main content with top padding for fixed header */}
                <main className="pt-16 min-h-screen">
                    {children}
                </main>

                {/* Footer */}
                <footer className="border-t border-noir-700 py-6 px-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-500">
                        <p>Powered by DigitalOcean Gradient™ AI Platform</p>
                        <p>Built for DigitalOcean Hackathon</p>
                    </div>
                </footer>
            </body>
        </html>
    );
}
