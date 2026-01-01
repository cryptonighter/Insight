/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}", // Added components directory
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#4ade80", // Softened from neon #39ff14 to softer green
                "primary-dim": "#22c55e",
                "background-light": "#f7f5f8",
                "background-dark": "#0a0a0a",
                "surface": "#121212",
            },
            fontFamily: {
                "display": ["Space Grotesk", "sans-serif"]
            },
            borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                glow: {
                    '0%': { boxShadow: '0 0 5px #4ade80' },
                    '100%': { boxShadow: '0 0 20px #4ade80, 0 0 10px #4ade80' },
                }
            }
        },
    },
    plugins: [],
}
