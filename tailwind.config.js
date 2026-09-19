/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#060911',
        surface: 'rgba(12, 18, 30, 0.85)',
        card: 'rgba(16, 24, 39, 0.75)',
        marines: {
          light: '#4ade80',
          DEFAULT: '#22c55e',
          dark: '#15803d'
        },
        station: {
          light: '#38bdf8',
          DEFAULT: '#0284c7',
          dark: '#0369a1'
        },
        troopers: {
          light: '#fb923c',
          DEFAULT: '#f97316',
          dark: '#c2410c'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif']
      }
    },
  },
  plugins: [],
}
