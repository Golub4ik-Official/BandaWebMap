/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#010803',
        surface: 'rgba(2, 16, 6, 0.92)',
        card: 'rgba(3, 24, 9, 0.85)',
        cm: {
          bg: '#010803',
          dark: '#020d04',
          panel: 'rgba(2, 16, 6, 0.94)',
          green: '#00ff41',
          bright: '#05ff46',
          btn: '#00e639',
          hover: '#00cc33',
          border: '#00ff41',
          dim: '#009926',
          muted: '#005917',
          black: '#000000',
        },
        marines: {
          light: '#05ff46',
          DEFAULT: '#00ff41',
          dark: '#009926'
        },
        station: {
          light: '#38bdf8',
          DEFAULT: '#00ff41',
          dark: '#009926'
        },
        troopers: {
          light: '#fb923c',
          DEFAULT: '#00ff41',
          dark: '#009926'
        }
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', '"JetBrains Mono"', 'monospace'],
        sans: ['"Share Tech Mono"', 'Inter', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
