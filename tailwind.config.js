/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          bg:          '#F4F6FB',
          surface:     '#FFFFFF',
          raised:      '#F8FAFD',
          border:      '#E8EDF5',
          borderLight: '#D0D7E8',
        },
        ink: {
          primary:   '#0A0F1E',
          secondary: '#3D4A63',
          muted:     '#8A96AD',
        },
        brand: {
          DEFAULT:  '#1B4FD8',
          hover:    '#163FBF',
          light:    '#2563EB',
          dim:      '#EEF3FF',
          dimBorder:'#C7D7FF',
        },
        accent: {
          gold:    '#B8860B',
          goldDim: '#FEFAEE',
        },
        good: {
          DEFAULT: '#0D9166',
          dim:     '#ECFDF6',
        },
        warn: {
          DEFAULT: '#CA8A04',
          dim:     '#FEFCE8',
        },
        bad: {
          DEFAULT: '#CF2323',
          dim:     '#FFF1F1',
        },
      },
      fontFamily: {
        display: ['Outfit', '"Space Grotesk"', 'sans-serif'],
        sans:    ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        outfit:  ['Outfit', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        'xs':  ['11px', '16px'],
        'sm':  ['13px', '20px'],
        'md':  ['14px', '22px'],
        'base':['15px', '24px'],
        'lg':  ['17px', '26px'],
        'xl':  ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '38px'],
      },
      boxShadow: {
        xs:   '0 1px 2px rgba(10,15,30,0.05)',
        sm:   '0 1px 3px rgba(10,15,30,0.07), 0 1px 2px rgba(10,15,30,0.04)',
        card: '0 4px 12px rgba(10,15,30,0.08), 0 0 0 1px rgba(10,15,30,0.04)',
        'card-hover': '0 8px 24px rgba(10,15,30,0.10), 0 0 0 1px rgba(10,15,30,0.05)',
        glow: '0 0 0 3px rgba(27,79,216,0.18)',
        'top': '0 -2px 12px rgba(10,15,30,0.06)',
        'inner-sm': 'inset 0 1px 3px rgba(10,15,30,0.06)',
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                               to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-12px)' },to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.94)' },     to: { opacity: '1', transform: 'scale(1)' } },
        shimmer:   { from: { backgroundPosition: '-200% 0' },              to: { backgroundPosition: '200% 0' } },
        pulse2:    { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.32s cubic-bezier(0.16,1,0.3,1)',
        'slide-down': 'slideDown 0.22s ease-out',
        'scale-in':   'scaleIn 0.22s cubic-bezier(0.16,1,0.3,1)',
        'shimmer':    'shimmer 1.8s linear infinite',
        'pulse2':     'pulse2 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
