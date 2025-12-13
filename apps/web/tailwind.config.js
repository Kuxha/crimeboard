/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                noir: {
                    900: '#0B0B12',
                    800: '#12121c',
                    700: '#1a1a2e',
                    600: '#252541',
                },
                laser: {
                    cyan: '#5EE7FF',
                    pink: '#FF3D81',
                    purple: '#A855F7',
                }
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'laser-flow': 'laser-flow 3s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: '0.6', filter: 'blur(8px)' },
                    '50%': { opacity: '1', filter: 'blur(12px)' },
                },
                'laser-flow': {
                    '0%': { strokeDashoffset: '100' },
                    '100%': { strokeDashoffset: '0' },
                }
            },
            boxShadow: {
                'neon-cyan': '0 0 20px rgba(94, 231, 255, 0.5)',
                'neon-pink': '0 0 20px rgba(255, 61, 129, 0.5)',
            }
        },
    },
    plugins: [],
}
