/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stage: {
          planting: '#b45309',
          seedling: '#f97316',
          growing: '#f59e0b',
          harvesting: '#eab308',
        },
      },
    },
  },
  plugins: [],
}
