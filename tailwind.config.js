/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#070b14',
          900: '#0b1220',
          800: '#121c33',
          700: '#1b2946',
        },
        electric: {
          50: '#eef3ff',
          100: '#dce6ff',
          400: '#5b8cff',
          500: '#2f6bff',
          600: '#1d54e8',
          700: '#1744c4',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 18, 32, 0.04), 0 16px 40px -24px rgba(11, 18, 32, 0.35)',
      },
    },
  },
  plugins: [],
}
