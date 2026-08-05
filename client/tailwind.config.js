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
      },
      animation: {
        'scroll-tv': 'scroll-tv 30s linear infinite',
      },
      keyframes: {
        'scroll-tv': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-33.33%)' },
        }
      }
    },
  },
  plugins: [],
}
