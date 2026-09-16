/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          bg:          '#F6F8FC',
          surface:     '#FFFFFF',
          raised:      '#F1F5F9',
          border:      '#E4E9F2',
          borderLight: '#CBD5E1',
        },
        ink: {
          primary:   '#0F172A',
          secondary: '#475569',
          muted:     '#94A3B8',
        },
        brand: {
          DEFAULT: '#2563EB',
          hover:   '#1D4ED8',
          dim:     '#EFF6FF',
        },
        amber: {
          DEFAULT: '#D97706',
          dim:     '#FFFBEB',
        },
        good: {
          DEFAULT: '#059669',
          dim:     '#ECFDF5',
        },
        bad: {
          DEFAULT: '#DC2626',
          dim:     '#FFF1F2',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        xs:   '0 1px 3px rgba(15,23,42,0.06)',
        card: '0 2px 8px rgba(15,23,42,0.07), 0 0 0 1px rgba(15,23,42,0.04)',
        glow: '0 0 0 3px rgba(37,99,235,0.15)',
        'up':  '0 -4px 24px rgba(15,23,42,0.08)',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                              to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.96)' },    to: { opacity: '1', transform: 'scale(1)' } },
        shimmer:   { from: { backgroundPosition: '-200% 0' },             to:  { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-in':    'fadeIn 0.22s ease-out',
        'slide-up':   'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'slide-down': 'slideDown 0.22s ease-out',
        'scale-in':   'scaleIn 0.2s ease-out',
        'shimmer':    'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
