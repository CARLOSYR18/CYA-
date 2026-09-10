/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          bg: '#12161D',
          surface: '#1A2029',
          raised: '#212836',
          border: '#2A3140',
          borderLight: '#343D4F',
        },
        ink: {
          primary: '#E9ECF1',
          secondary: '#98A2B3',
          muted: '#5F6B7E',
        },
        brand: {
          DEFAULT: '#4F7CFF',
          hover: '#6A8FFF',
          dim: '#25335C',
        },
        amber: {
          DEFAULT: '#E8A33D',
          dim: '#3A2E17',
        },
        good: {
          DEFAULT: '#3DBD82',
          dim: '#173327',
        },
        bad: {
          DEFAULT: '#E5484D',
          dim: '#3A1B1C',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
