/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        volt: {
          DEFAULT: '#d4ff33',
          400: '#dcff5c',
          500: '#d4ff33',
          600: '#b8e619',
        },
        obsidian: {
          DEFAULT: '#080a08',
          card: '#111411',
          elevated: '#161a16',
          border: '#252a24',
          muted: '#9ca396',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
