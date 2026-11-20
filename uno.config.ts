// uno.config.ts
import { readFileSync } from "node:fs";
import { defineConfig, presetAttributify, presetUno, transformerDirectives} from "unocss";
import presetAnimate from 'unocss-preset-animate';

export default defineConfig({
  content: {
    filesystem: [
      // Narrow scope to specific directories
      './src/**/*.{astro,md,mdx,ts,tsx}'
    ],  },
  theme: {
    boxShadow: {
      custom: `2px 2px 0`,
      "custom-hover": `1px 1px 0`,
    },
    fontFamily: {
      sans: ['JetBrains Mono', 'system-ui', 'sans-serif'],
    },
    gridTemplateRows: {
      "auto-250": "repeat(auto-fill, 250px)",
    },
    gridTemplateColumns: {
      "4-minmax": "repeat(4, minmax(150px, 1fr))",
    },
    colors: {
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
      },
      secondary: {
        DEFAULT: 'hsl(var(--secondary))',
        foreground: 'hsl(var(--secondary-foreground))',
      },
      third :{
        DEFAULT: 'hsl(var(--third))',
      },
      muted: {
        DEFAULT: 'hsl(var(--muted))',
        foreground: 'hsl(var(--muted-foreground))',
      },
      accent: {
        DEFAULT: 'hsl(var(--accent))',
        foreground: 'hsl(var(--accent-foreground))',
      },
      additive: {
        DEFAULT: 'hsl(var(--additive))',
        foreground: 'hsl(var(--additive-foreground))',
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive))',
        foreground: 'hsl(var(--destructive-foreground))',
      },
      border: 'hsl(var(--border))',
      ring: 'hsl(var(--ring))',
    },
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetAnimate as any,
  ],
  // Legacy `.prose` styles (see src/styles/prose.css). Preflights are emitted
  // before utilities, so classes like max-w-none still override them.
  preflights: [
    { getCSS: () => readFileSync(new URL("./src/styles/prose.css", import.meta.url), "utf8") },
  ],
  transformers: [
    transformerDirectives(),
  ],
  variants: [
    (matcher) => {
      if (!matcher.startsWith('group-has-hover:'))
        return matcher

      const unprefixed = matcher.slice('group-has-hover:'.length)
      return {
        matcher: unprefixed,
        selector: (s) => ':merge(.group):has(.has-overlay:hover) ' + s,
      }
    },
  ],
});