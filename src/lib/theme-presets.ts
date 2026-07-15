// User-selectable theme presets: color palettes and font pairs.
// Applied by writing CSS variables on <html> and persisted to localStorage
// so the choice syncs across every route and tab in the app.

export type PalettePreset = {
  id: string;
  name: string;
  description: string;
  // Swatches shown in the picker (hex) — visual only.
  swatches: string[];
  // Tokens written to :root (oklch strings). Keep keys aligned with styles.css.
  light: {
    primary: string;
    "primary-foreground": string;
    secondary: string;
    "secondary-foreground": string;
    accent: string;
    "accent-foreground": string;
    ring: string;
  };
  dark: {
    primary: string;
    "primary-foreground": string;
    secondary: string;
    "secondary-foreground": string;
    accent: string;
    "accent-foreground": string;
    ring: string;
  };
};

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "mission-warm",
    name: "Mission Warm (Default)",
    description: "Forest green & terracotta on parchment",
    swatches: ["#4A5D4E", "#C4654A", "#E8A87C", "#FDFBF7"],
    light: {
      primary: "oklch(0.48 0.06 155)",
      "primary-foreground": "oklch(0.985 0.006 90)",
      secondary: "oklch(0.55 0.12 45)",
      "secondary-foreground": "oklch(0.985 0.006 90)",
      accent: "oklch(0.90 0.03 85)",
      "accent-foreground": "oklch(0.32 0.04 150)",
      ring: "oklch(0.48 0.06 155)",
    },
    dark: {
      primary: "oklch(0.70 0.08 155)",
      "primary-foreground": "oklch(0.18 0.02 140)",
      secondary: "oklch(0.68 0.12 45)",
      "secondary-foreground": "oklch(0.18 0.02 140)",
      accent: "oklch(0.32 0.04 150)",
      "accent-foreground": "oklch(0.9 0.05 150)",
      ring: "oklch(0.70 0.08 155)",
    },
  },
  {
    id: "ocean-deep",
    name: "Ocean Deep",
    description: "Calm blues and teals",
    swatches: ["#0c2340", "#1a4a6e", "#2d8a9e", "#5cbdb9"],
    light: {
      primary: "oklch(0.42 0.10 240)",
      "primary-foreground": "oklch(0.99 0 0)",
      secondary: "oklch(0.62 0.11 210)",
      "secondary-foreground": "oklch(0.99 0 0)",
      accent: "oklch(0.90 0.04 220)",
      "accent-foreground": "oklch(0.30 0.09 240)",
      ring: "oklch(0.42 0.10 240)",
    },
    dark: {
      primary: "oklch(0.72 0.11 220)",
      "primary-foreground": "oklch(0.15 0.03 240)",
      secondary: "oklch(0.68 0.11 200)",
      "secondary-foreground": "oklch(0.15 0.03 240)",
      accent: "oklch(0.35 0.06 220)",
      "accent-foreground": "oklch(0.92 0.04 220)",
      ring: "oklch(0.72 0.11 220)",
    },
  },
  {
    id: "midnight-indigo",
    name: "Midnight Indigo",
    description: "Sophisticated electric indigo",
    swatches: ["#0a0a1a", "#141432", "#1e1e5a", "#4f46e5"],
    light: {
      primary: "oklch(0.42 0.18 275)",
      "primary-foreground": "oklch(0.99 0 0)",
      secondary: "oklch(0.55 0.14 290)",
      "secondary-foreground": "oklch(0.99 0 0)",
      accent: "oklch(0.92 0.03 275)",
      "accent-foreground": "oklch(0.30 0.15 275)",
      ring: "oklch(0.42 0.18 275)",
    },
    dark: {
      primary: "oklch(0.72 0.16 275)",
      "primary-foreground": "oklch(0.15 0.05 275)",
      secondary: "oklch(0.65 0.14 295)",
      "secondary-foreground": "oklch(0.15 0.05 275)",
      accent: "oklch(0.32 0.08 275)",
      "accent-foreground": "oklch(0.92 0.04 275)",
      ring: "oklch(0.72 0.16 275)",
    },
  },
  {
    id: "emerald-prestige",
    name: "Emerald Prestige",
    description: "Rich emerald with gold",
    swatches: ["#064e3b", "#0d7a5f", "#c9a84c", "#f5f0e0"],
    light: {
      primary: "oklch(0.42 0.10 165)",
      "primary-foreground": "oklch(0.99 0 0)",
      secondary: "oklch(0.68 0.10 85)",
      "secondary-foreground": "oklch(0.20 0.04 60)",
      accent: "oklch(0.92 0.04 90)",
      "accent-foreground": "oklch(0.28 0.08 165)",
      ring: "oklch(0.42 0.10 165)",
    },
    dark: {
      primary: "oklch(0.70 0.10 165)",
      "primary-foreground": "oklch(0.15 0.03 165)",
      secondary: "oklch(0.75 0.11 85)",
      "secondary-foreground": "oklch(0.18 0.03 60)",
      accent: "oklch(0.32 0.06 165)",
      "accent-foreground": "oklch(0.92 0.05 85)",
      ring: "oklch(0.70 0.10 165)",
    },
  },
  {
    id: "sunset-blaze",
    name: "Sunset Blaze",
    description: "Warm orange to magenta",
    swatches: ["#ff6b35", "#f7931e", "#e84393", "#6c5ce7"],
    light: {
      primary: "oklch(0.62 0.19 35)",
      "primary-foreground": "oklch(0.99 0 0)",
      secondary: "oklch(0.60 0.22 355)",
      "secondary-foreground": "oklch(0.99 0 0)",
      accent: "oklch(0.92 0.05 40)",
      "accent-foreground": "oklch(0.35 0.15 35)",
      ring: "oklch(0.62 0.19 35)",
    },
    dark: {
      primary: "oklch(0.72 0.18 40)",
      "primary-foreground": "oklch(0.15 0.05 40)",
      secondary: "oklch(0.68 0.20 355)",
      "secondary-foreground": "oklch(0.15 0.05 355)",
      accent: "oklch(0.34 0.10 40)",
      "accent-foreground": "oklch(0.92 0.06 40)",
      ring: "oklch(0.72 0.18 40)",
    },
  },
  {
    id: "noir-gold",
    name: "Noir & Gold",
    description: "Editorial black with gold accents",
    swatches: ["#0d0d0d", "#1a1a1a", "#c9a84c", "#f0d78c"],
    light: {
      primary: "oklch(0.20 0.01 90)",
      "primary-foreground": "oklch(0.95 0.04 85)",
      secondary: "oklch(0.72 0.11 85)",
      "secondary-foreground": "oklch(0.15 0.02 90)",
      accent: "oklch(0.93 0.05 85)",
      "accent-foreground": "oklch(0.22 0.02 90)",
      ring: "oklch(0.72 0.11 85)",
    },
    dark: {
      primary: "oklch(0.85 0.12 85)",
      "primary-foreground": "oklch(0.15 0.02 90)",
      secondary: "oklch(0.72 0.11 85)",
      "secondary-foreground": "oklch(0.15 0.02 90)",
      accent: "oklch(0.32 0.05 85)",
      "accent-foreground": "oklch(0.92 0.06 85)",
      ring: "oklch(0.85 0.12 85)",
    },
  },
  {
    id: "cherry-blossom",
    name: "Cherry Blossom",
    description: "Soft pinks, gentle and warm",
    swatches: ["#fef0f5", "#f8c8d8", "#e88aab", "#c45c7c"],
    light: {
      primary: "oklch(0.58 0.14 350)",
      "primary-foreground": "oklch(0.99 0 0)",
      secondary: "oklch(0.72 0.12 355)",
      "secondary-foreground": "oklch(0.99 0 0)",
      accent: "oklch(0.94 0.04 350)",
      "accent-foreground": "oklch(0.32 0.12 350)",
      ring: "oklch(0.58 0.14 350)",
    },
    dark: {
      primary: "oklch(0.75 0.13 350)",
      "primary-foreground": "oklch(0.18 0.04 350)",
      secondary: "oklch(0.78 0.11 355)",
      "secondary-foreground": "oklch(0.18 0.04 350)",
      accent: "oklch(0.34 0.08 350)",
      "accent-foreground": "oklch(0.94 0.05 350)",
      ring: "oklch(0.75 0.13 350)",
    },
  },
  {
    id: "slate-steel",
    name: "Slate & Steel",
    description: "Modern enterprise grays",
    swatches: ["#2d3748", "#4a5568", "#718096", "#a0aec0"],
    light: {
      primary: "oklch(0.35 0.02 250)",
      "primary-foreground": "oklch(0.99 0 0)",
      secondary: "oklch(0.55 0.03 250)",
      "secondary-foreground": "oklch(0.99 0 0)",
      accent: "oklch(0.92 0.01 250)",
      "accent-foreground": "oklch(0.28 0.02 250)",
      ring: "oklch(0.35 0.02 250)",
    },
    dark: {
      primary: "oklch(0.75 0.02 250)",
      "primary-foreground": "oklch(0.18 0.02 250)",
      secondary: "oklch(0.65 0.02 250)",
      "secondary-foreground": "oklch(0.18 0.02 250)",
      accent: "oklch(0.32 0.02 250)",
      "accent-foreground": "oklch(0.92 0.01 250)",
      ring: "oklch(0.75 0.02 250)",
    },
  },
];

export type FontPreset = {
  id: string;
  name: string;
  displayName: string; // headings
  sansName: string; // body
  // Google Fonts CSS href (loaded via <link> on demand). Null = system fonts already loaded.
  googleHref: string | null;
};

export const FONT_PRESETS: FontPreset[] = [
  {
    id: "playfair-inter",
    name: "Playfair × Inter (Default)",
    displayName: "Playfair Display",
    sansName: "Inter",
    googleHref: null, // already loaded in __root.tsx
  },
  {
    id: "space-grotesk-dm-sans",
    name: "Space Grotesk × DM Sans",
    displayName: "Space Grotesk",
    sansName: "DM Sans",
    googleHref:
      "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
  },
  {
    id: "syne-jakarta",
    name: "Syne × Plus Jakarta",
    displayName: "Syne",
    sansName: "Plus Jakarta Sans",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap",
  },
  {
    id: "instrument-serif-work-sans",
    name: "Instrument Serif × Work Sans",
    displayName: "Instrument Serif",
    sansName: "Work Sans",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600;700&display=swap",
  },
  {
    id: "dm-serif-fira-sans",
    name: "DM Serif × Fira Sans",
    displayName: "DM Serif Display",
    sansName: "Fira Sans",
    googleHref:
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fira+Sans:wght@400;500;600;700&display=swap",
  },
  {
    id: "cormorant-karla",
    name: "Cormorant × Karla",
    displayName: "Cormorant Garamond",
    sansName: "Karla",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Karla:wght@400;500;600;700&display=swap",
  },
  {
    id: "lora-nunito-sans",
    name: "Lora × Nunito Sans",
    displayName: "Lora",
    sansName: "Nunito Sans",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Nunito+Sans:wght@400;600;700&display=swap",
  },
  {
    id: "bebas-neue-barlow",
    name: "Bebas Neue × Barlow",
    displayName: "Bebas Neue",
    sansName: "Barlow",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap",
  },
  {
    id: "outfit-figtree",
    name: "Outfit × Figtree",
    displayName: "Outfit",
    sansName: "Figtree",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap",
  },
];

export const PALETTE_STORAGE_KEY = "ccm-palette";
export const FONT_STORAGE_KEY = "ccm-fontpair";

export function findPalette(id: string | null | undefined): PalettePreset | null {
  if (!id) return null;
  return PALETTE_PRESETS.find((p) => p.id === id) ?? null;
}

export function findFont(id: string | null | undefined): FontPreset | null {
  if (!id) return null;
  return FONT_PRESETS.find((f) => f.id === id) ?? null;
}

export function applyPalette(palette: PalettePreset | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const keys = ["primary", "primary-foreground", "secondary", "secondary-foreground", "accent", "accent-foreground", "ring"] as const;
  if (!palette) {
    keys.forEach((k) => root.style.removeProperty(`--${k}`));
    return;
  }
  const isDark = root.classList.contains("dark");
  const tokens = isDark ? palette.dark : palette.light;
  keys.forEach((k) => root.style.setProperty(`--${k}`, tokens[k]));
}

const FONT_LINK_ID = "ccm-custom-font-link";

export function applyFont(font: FontPreset | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Manage the injected <link> for Google Fonts.
  const existing = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (font?.googleHref) {
    if (existing) {
      if (existing.href !== font.googleHref) existing.href = font.googleHref;
    } else {
      const link = document.createElement("link");
      link.id = FONT_LINK_ID;
      link.rel = "stylesheet";
      link.href = font.googleHref;
      document.head.appendChild(link);
    }
  } else if (existing) {
    existing.remove();
  }

  if (!font) {
    root.style.removeProperty("--font-sans");
    root.style.removeProperty("--font-display");
    return;
  }
  root.style.setProperty(
    "--font-display",
    `"${font.displayName}", ui-serif, Georgia, serif`,
  );
  root.style.setProperty(
    "--font-sans",
    `"${font.sansName}", ui-sans-serif, system-ui, sans-serif`,
  );
}
