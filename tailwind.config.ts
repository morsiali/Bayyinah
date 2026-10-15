import type { Config } from 'tailwindcss';

// Design language after penti.ai: white and mist surfaces, near-black ink, a violet accent,
// blue/green/teal signal colors, sharp corners, uppercase display type and mono labels.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.25rem', screens: { '2xl': '1240px' } },
    extend: {
      fontFamily: {
        // Latin in DM Sans, Arabic glyphs fall through to Cairo.
        sans: ['"DM Sans Variable"', '"Cairo Variable"', 'Tahoma', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"Cairo Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        arabic: ['"Cairo Variable"', 'Tahoma', 'sans-serif'],
      },
      colors: {
        canvas: '#ffffff',
        mist: '#f8f8fc',
        ink: { DEFAULT: '#0a0a14', soft: '#3d3d52', muted: '#5a5a70', faint: '#a0a0b4' },
        line: { DEFAULT: '#e6e7eb', strong: '#cfd1d6' },
        navy: { DEFAULT: '#0a0a14', 900: '#070707', 800: '#15151f', 700: '#2a2a3a', 600: '#3d3d52' },
        brand: {
          50: '#f3f1ff', 100: '#e7e3ff', 200: '#d1c9ff', 300: '#b0a3ff', 400: '#8f7eff',
          500: '#7b6bff', 600: '#6d5aff', 700: '#5a45f0', 800: '#4a37c9', 900: '#3c2e9e',
        },
        signal: { blue: '#2b7ee8', green: '#06d98a', teal: '#15d0be', red: '#e8334a', amber: '#f5a623', violet: '#7b5fc8' },
      },
      borderRadius: { sm: '2px', DEFAULT: '4px', md: '4px', lg: '6px', xl: '6px', '2xl': '8px', '3xl': '12px', '4xl': '16px' },
      boxShadow: {
        card: '0 1px 0 rgba(10,10,20,0.02)',
        lift: '0 2px 4px rgba(10,10,20,0.04), 0 30px 60px -30px rgba(10,10,20,0.35)',
        pill: 'none',
      },
      letterSpacing: { tightest: '-0.03em', tighter2: '-0.02em', label: '0.08em' },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'marquee-rtl': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(50%)' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        'marquee-rtl': 'marquee-rtl 40s linear infinite',
        'fade-up': 'fade-up .5s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
