import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.25rem', screens: { '2xl': '1240px' } },
    extend: {
      fontFamily: {
        sans: ['"Cairo Variable"', 'Cairo', 'Tahoma', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        canvas: '#fbfbfa',
        ink: { DEFAULT: '#09090b', soft: '#3f3f46', muted: '#71717b', faint: '#9f9fa9' },
        line: { DEFAULT: '#e8e8e5', strong: '#d4d4d8' },
        navy: { DEFAULT: '#0f1b2d', 900: '#0a1220', 800: '#13233a', 700: '#1e3a5f', 600: '#2a4c78' },
        brand: {
          50: '#eff8ff', 100: '#dbeefe', 200: '#bfe2fe', 300: '#8ed1ff', 400: '#51b6ff',
          500: '#2b9aff', 600: '#157efc', 700: '#1468e6', 800: '#1956b8', 900: '#1c4b8e',
        },
      },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        card: '0 1px 2px rgba(9,9,11,0.04), 0 8px 24px -12px rgba(9,9,11,0.10)',
        lift: '0 2px 4px rgba(9,9,11,0.04), 0 24px 48px -20px rgba(15,27,45,0.25)',
        pill: '0 1px 2px rgba(9,9,11,0.06), 0 4px 12px -6px rgba(9,9,11,0.12)',
      },
      letterSpacing: { tightest: '-0.045em', tighter2: '-0.03em' },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        'fade-up': 'fade-up .5s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
