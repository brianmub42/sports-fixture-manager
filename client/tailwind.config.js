/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        zam: '#2563eb',
        bar: '#dc2626',
        hal: '#16a34a',
        sha: '#9333ea',
        teh: '#ea580c',
        tow: '#0891b2',
      }
    },
  },
  plugins: [],
}
