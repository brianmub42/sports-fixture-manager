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
        // Cupertino Minimal - Override default colors
        blue: {
          50: 'hsl(210, 100%, 98%)',
          100: 'hsl(210, 100%, 95%)',
          200: 'hsl(210, 100%, 90%)',
          300: 'hsl(210, 100%, 80%)',
          400: 'hsl(210, 100%, 70%)',
          500: 'hsl(210, 100%, 50%)', // Apple Blue
          600: 'hsl(210, 100%, 45%)', // Apple Blue Accent
          700: 'hsl(210, 100%, 40%)',
          800: 'hsl(210, 100%, 30%)',
          900: 'hsl(210, 100%, 20%)',
          950: 'hsl(210, 100%, 10%)',
        },
        gray: {
          50: 'hsl(0, 0%, 96%)',    // Apple soft light grey
          100: 'hsl(0, 0%, 92%)',
          200: 'hsl(0, 0%, 88%)',   // Apple light border
          300: 'hsl(0, 0%, 75%)',
          400: 'hsl(0, 0%, 55%)',   // Apple muted text
          500: 'hsl(0, 0%, 45%)',
          600: 'hsl(0, 0%, 35%)',
          700: 'hsl(0, 0%, 25%)',
          800: 'hsl(0, 0%, 15%)',   // Apple dark border
          900: 'hsl(0, 0%, 8%)',    // Apple dark card background
          950: 'hsl(0, 0%, 0%)',    // Apple pure black background
        },
        zam: '#2563eb',
        bar: '#dc2626',
        hal: '#16a34a',
        sha: '#9333ea',
        teh: '#ea580c',
        tow: '#0891b2',
      },
      borderRadius: {
        'xl': '10px',   // Apple smooth corners
        '2xl': '12px',
        '3xl': '16px',
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
