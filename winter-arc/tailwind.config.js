/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'arc-green': '#39FF14',
        'arc-amber': '#FFBF00',
        'arc-red': '#FF003F',
        'arc-bg': '#000000',
        'arc-panel': '#111111',
        'arc-text': '#FFFFFF',
        'arc-muted': '#666666',
      }
    },
  },
  plugins: [],
}
