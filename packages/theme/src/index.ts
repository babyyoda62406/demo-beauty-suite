/**
 * FGD Beauty Suite — brand design tokens (SPEC §8).
 *
 * Single source of truth for the "Estudio Aurora" brand: colour scales,
 * ink/state colours, typography and radii. Consumed by `apps/web` (Tailwind
 * preset + CSS variables) and by the shared UI package.
 *
 * White-label: a tenant may override these values at runtime via
 * `Tenant.brand`; keep the shape stable so overrides can be merged cleanly.
 */

/** A 50..950 colour scale (Tailwind-compatible keys). */
export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

/**
 * Primary brand scale: magenta / fuchsia. Hex values are taken verbatim from
 * SPEC §8 and must not be altered.
 */
export const brandPalette: ColorScale = {
  50: '#FCE7F1',
  100: '#FBCFE3',
  200: '#F7A9CC',
  300: '#F075AE',
  400: '#E84393',
  500: '#D6157F', // principal
  600: '#C2185B',
  700: '#9D0E4B',
  800: '#7A0B3A',
  900: '#5A0A2C',
  950: '#3A0620',
};

/** Warm near-black "ink" colours for text and high-contrast surfaces. */
export const ink = {
  DEFAULT: '#1A1012',
  soft: '#5A4A4E',
} as const;

/** Warm surfaces: the marketing canvas is ivory/cream, cards a warm off-white. */
export const surface = {
  base: '#FFFDFB',
  subtle: '#FBF6EF',
} as const;

/**
 * Warm ivory canvas scale — the dominant background of the editorial marketing
 * site. `deep` is the slightly toasted variant used for alternating sections.
 */
export const cream = {
  DEFAULT: '#FBF6EF',
  deep: '#F6EEE4',
} as const;

/**
 * Rose-gold / champagne metallic accent used for hairlines, filets and fine
 * editorial detailing. `soft` leans champagne, the default leans rose gold.
 */
export const gold = {
  DEFAULT: '#B76E79',
  soft: '#C9A26B',
} as const;

/** Semantic state colours (SPEC §8). */
export const stateColors = {
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
} as const;

/**
 * Typography families (loaded via `next/font` in the web app). Dirección de la
 * clienta (RONDA 1): títulos en Cormorant Garamond, firma manuscrita en Allura,
 * UI/cuerpo en Poppins.
 * - `display` / `script`: firma manuscrita "Estudio Aurora" (Allura).
 * - `serif`: títulos y display editorial (Cormorant Garamond).
 * - `sans`: UI / cuerpo / botones (Poppins).
 */
export const fontFamilies = {
  display: 'Allura',
  script: 'Allura',
  serif: 'Cormorant Garamond',
  sans: 'Poppins',
} as const;

/**
 * Font stacks with sensible system fallbacks, referencing the CSS variables
 * that `next/font` exposes. Ready to drop into a Tailwind `fontFamily` config.
 */
export const fontFamilyStacks = {
  display: ['var(--font-script)', 'Allura', 'cursive'],
  script: ['var(--font-script)', 'Allura', 'cursive'],
  serif: ['var(--font-serif)', 'Cormorant Garamond', 'Georgia', 'serif'],
  sans: ['var(--font-sans)', 'Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
} as const;

/** Generous corner radii — the brand leans on `rounded-2xl` (SPEC §8). */
export const radii = {
  none: '0px',
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  full: '9999px',
} as const;

/** Soft, warm shadow tokens — cocoa-tinted, not neutral grey. */
export const shadows = {
  soft: '0 6px 24px -10px rgba(74, 40, 30, 0.22)',
  card: '0 24px 60px -28px rgba(46, 24, 20, 0.35)',
  glow: '0 0 30px -6px rgba(214, 21, 127, 0.35)',
} as const;

/** Subtle magenta gradients used across hero and accents. */
export const gradients = {
  brand: `linear-gradient(135deg, ${brandPalette[400]} 0%, ${brandPalette[600]} 100%)`,
  soft: `linear-gradient(135deg, ${brandPalette[50]} 0%, ${surface.subtle} 100%)`,
} as const;

/**
 * Aggregate brand token object. Also the shape a tenant override should follow
 * (partially) when white-labelling.
 */
export const brandTokens = {
  palette: brandPalette,
  ink,
  surface,
  cream,
  gold,
  state: stateColors,
  fonts: fontFamilies,
  fontStacks: fontFamilyStacks,
  radii,
  shadows,
  gradients,
} as const;

export type BrandTokens = typeof brandTokens;

/**
 * Reusable Tailwind preset. Import in `apps/web/tailwind.config.ts` via
 * `presets: [tailwindPreset]` so the web app and shared UI share one scale.
 */
export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        brand: brandPalette,
        ink: {
          DEFAULT: ink.DEFAULT,
          soft: ink.soft,
        },
        surface: {
          DEFAULT: surface.base,
          subtle: surface.subtle,
        },
        cream: {
          DEFAULT: cream.DEFAULT,
          deep: cream.deep,
        },
        gold: {
          DEFAULT: gold.DEFAULT,
          soft: gold.soft,
        },
        success: stateColors.success,
        warning: stateColors.warning,
        danger: stateColors.danger,
        info: stateColors.info,
      },
      fontFamily: {
        display: fontFamilyStacks.display,
        script: fontFamilyStacks.script,
        serif: fontFamilyStacks.serif,
        sans: fontFamilyStacks.sans,
      },
      borderRadius: {
        lg: radii.lg,
        xl: radii.xl,
        '2xl': radii['2xl'],
        '3xl': radii['3xl'],
      },
      boxShadow: {
        soft: shadows.soft,
        card: shadows.card,
        glow: shadows.glow,
      },
      backgroundImage: {
        'brand-gradient': gradients.brand,
        'brand-soft': gradients.soft,
      },
    },
  },
} as const;

export type TailwindPreset = typeof tailwindPreset;
