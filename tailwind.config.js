/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          raised: '#F1F5F9',
          border: '#E2E8F0',
          borderLight: '#CBD5E1',
        },
        ink: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
        },
        brand: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          dim: '#EFF6FF',
        },
        amber: {
          DEFAULT: '#D97706',
          dim: '#FEF3C7',
        },
        good: {
          DEFAULT: '#059669',
          dim: '#ECFDF5',
        },
        bad: {
          DEFAULT: '#DC2626',
          dim: '#FEF2F2',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
