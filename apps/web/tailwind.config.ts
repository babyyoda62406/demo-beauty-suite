import type { Config } from 'tailwindcss';
import { tailwindPreset } from '@fgd/theme';

/**
 * Web app Tailwind config. Shares one scale with the design system via the
 * `@fgd/theme` preset (brand palette, radii, shadows, gradients). Content globs
 * cover the app and the shared UI package so classes there are never purged.
 */
const config: Config = {
  darkMode: 'class',
  presets: [tailwindPreset as unknown as Partial<Config>],
  content: [
    './src/**/*.{ts,tsx,mdx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.25rem',
        lg: '2rem',
      },
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      fontFamily: {
        // Cormorant Garamond (título/display editorial), Allura (firma
        // manuscrita "Estudio Aurora") y Poppins (UI/cuerpo/botones). Pedido
        // explícito de la clienta (RONDA 1).
        display: ['var(--font-script)', 'Allura', 'cursive'],
        script: ['var(--font-script)', 'Allura', 'cursive'],
        serif: ['var(--font-serif)', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out both',
        float: 'float 6s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
