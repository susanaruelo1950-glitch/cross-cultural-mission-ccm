// User-selectable theme presets: color palettes, custom color picker, and
// font pairs. Applied by writing CSS variables on <html> and persisted to
// localStorage so the choice syncs across every route and tab in the app.

export type PalettePreset = {
  id: string;
  name: string;
  description: string;
  swatches: string[]; // display-only hex swatches
  light: PaletteTokens;
  dark: PaletteTokens;
};

export type PaletteTokens = {
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  accent: string;
  "accent-foreground": string;
  ring: string;
};

// ---------------------------------------------------------------------------
// Curated professional palettes
// ---------------------------------------------------------------------------
export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "mission-warm",
    name: "CBCP Navy (Default)",
    description: "CBCP navy blue on parchment",
    swatches: ["#0f1b3d", "#1e3a5f", "#3b6fa0", "#e8edf3"],
    light: {
      primary: "oklch(0.32 0.09 255)",
      "primary-foreground": "oklch(0.99 0 0)",
      secondary: "oklch(0.55 0.09 250)",
      "secondary-foreground": "oklch(0.99 0 0)",
      accent: "oklch(0.93 0.02 250)",
      "accent-foreground": "oklch(0.28 0.09 255)",
      ring: "oklch(0.32 0.09 255)",
    },
    dark: {
      primary: "oklch(0.70 0.10 255)",
      "primary-foreground": "oklch(0.14 0.04 255)",
      secondary: "oklch(0.65 0.10 250)",
      "secondary-foreground": "oklch(0.14 0.04 255)",
      accent: "oklch(0.30 0.06 255)",
      "accent-foreground": "oklch(0.93 0.03 250)",
      ring: "oklch(0.70 0.10 255)",
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
    id: "royal-sapphire",
    name: "Royal Sapphire",
    description: "Deep sapphire, silver, ivory",
    swatches: ["#0b1a3a", "#1e3a8a", "#94a3b8", "#f8fafc"],
    light: {
      primary: "oklch(0.36 0.14 260)",
      "primary-foreground": "oklch(0.99 0 0)",
      secondary: "oklch(0.55 0.03 255)",
      "secondary-foreground": "oklch(0.99 0 0)",
      accent: "oklch(0.92 0.02 255)",
      "accent-foreground": "oklch(0.30 0.10 260)",
      ring: "oklch(0.36 0.14 260)",
    },
    dark: {
      primary: "oklch(0.72 0.13 260)",
      "primary-foreground": "oklch(0.14 0.04 260)",
      secondary: "oklch(0.68 0.03 255)",
      "secondary-foreground": "oklch(0.14 0.04 260)",
      accent: "oklch(0.30 0.06 260)",
      "accent-foreground": "oklch(0.94 0.03 260)",
      ring: "oklch(0.72 0.13 260)",
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
    description: "Editorial black with gold",
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
  {
    id: "forest-moss",
    name: "Forest & Moss",
    description: "Deep greens, organic and grounding",
    swatches: ["#1a3c2a", "#2d5a3d", "#5a8a5c", "#a0c49d"],
    light: {
      primary: "oklch(0.38 0.08 150)",
      "primary-foreground": "oklch(0.99 0 0)",
      secondary: "oklch(0.58 0.09 145)",
      "secondary-foreground": "oklch(0.99 0 0)",
      accent: "oklch(0.92 0.03 140)",
      "accent-foreground": "oklch(0.28 0.08 150)",
      ring: "oklch(0.38 0.08 150)",
    },
    dark: {
      primary: "oklch(0.72 0.09 150)",
      "primary-foreground": "oklch(0.14 0.04 150)",
      secondary: "oklch(0.68 0.09 145)",
      "secondary-foreground": "oklch(0.14 0.04 150)",
      accent: "oklch(0.32 0.06 150)",
      "accent-foreground": "oklch(0.92 0.04 150)",
      ring: "oklch(0.72 0.09 150)",
    },
  },
  {
    id: "navy-trust",
    name: "Navy Trust",
    description: "Finance and legal navy",
    swatches: ["#0f1b3d", "#1e3a5f", "#3b6fa0", "#e8edf3"],
    light: {
      primary: "oklch(0.32 0.09 255)",
      "primary-foreground": "oklch(0.99 0 0)",
      secondary: "oklch(0.55 0.09 250)",
      "secondary-foreground": "oklch(0.99 0 0)",
      accent: "oklch(0.93 0.02 250)",
      "accent-foreground": "oklch(0.28 0.09 255)",
      ring: "oklch(0.32 0.09 255)",
    },
    dark: {
      primary: "oklch(0.70 0.10 255)",
      "primary-foreground": "oklch(0.14 0.04 255)",
      secondary: "oklch(0.65 0.10 250)",
      "secondary-foreground": "oklch(0.14 0.04 255)",
      accent: "oklch(0.30 0.06 255)",
      "accent-foreground": "oklch(0.93 0.03 250)",
      ring: "oklch(0.70 0.10 255)",
    },
  },
  {
    id: "burgundy-ivory",
    name: "Burgundy & Ivory",
    description: "Rich burgundy with cream",
    swatches: ["#5e1b25", "#8b2c3b", "#c68b74", "#f4ecd8"],
    light: {
      primary: "oklch(0.38 0.13 20)",
      "primary-foreground": "oklch(0.98 0.01 90)",
      secondary: "oklch(0.65 0.08 40)",
      "secondary-foreground": "oklch(0.18 0.05 25)",
      accent: "oklch(0.93 0.03 60)",
      "accent-foreground": "oklch(0.30 0.10 20)",
      ring: "oklch(0.38 0.13 20)",
    },
    dark: {
      primary: "oklch(0.68 0.13 20)",
      "primary-foreground": "oklch(0.15 0.04 20)",
      secondary: "oklch(0.72 0.08 40)",
      "secondary-foreground": "oklch(0.15 0.04 25)",
      accent: "oklch(0.32 0.08 25)",
      "accent-foreground": "oklch(0.93 0.04 60)",
      ring: "oklch(0.68 0.13 20)",
    },
  },
  {
    id: "graphite-teal",
    name: "Graphite & Teal",
    description: "Neutral graphite with teal accents",
    swatches: ["#1f2937", "#374151", "#0d9488", "#5eead4"],
    light: {
      primary: "oklch(0.28 0.02 250)",
      "primary-foreground": "oklch(0.99 0 0)",
      secondary: "oklch(0.55 0.10 190)",
      "secondary-foreground": "oklch(0.99 0 0)",
      accent: "oklch(0.92 0.04 190)",
      "accent-foreground": "oklch(0.28 0.08 190)",
      ring: "oklch(0.55 0.10 190)",
    },
    dark: {
      primary: "oklch(0.85 0.02 250)",
      "primary-foreground": "oklch(0.16 0.02 250)",
      secondary: "oklch(0.72 0.11 190)",
      "secondary-foreground": "oklch(0.16 0.04 190)",
      accent: "oklch(0.32 0.06 190)",
      "accent-foreground": "oklch(0.92 0.05 190)",
      ring: "oklch(0.72 0.11 190)",
    },
  },
  {
    id: "clay-sage",
    name: "Clay & Sage",
    description: "Earthy clay with sage green",
    swatches: ["#a0522d", "#c4956b", "#87a878", "#4a6741"],
    light: {
      primary: "oklch(0.52 0.10 40)",
      "primary-foreground": "oklch(0.99 0 0)",
      secondary: "oklch(0.55 0.07 145)",
      "secondary-foreground": "oklch(0.99 0 0)",
      accent: "oklch(0.92 0.04 60)",
      "accent-foreground": "oklch(0.32 0.10 40)",
      ring: "oklch(0.52 0.10 40)",
    },
    dark: {
      primary: "oklch(0.70 0.11 40)",
      "primary-foreground": "oklch(0.15 0.04 40)",
      secondary: "oklch(0.68 0.08 145)",
      "secondary-foreground": "oklch(0.15 0.04 145)",
      accent: "oklch(0.32 0.07 40)",
      "accent-foreground": "oklch(0.92 0.05 60)",
      ring: "oklch(0.70 0.11 40)",
    },
  },
];

// ---------------------------------------------------------------------------
// Font pairings (headline × body)
// ---------------------------------------------------------------------------
export type FontPreset = {
  id: string;
  name: string;
  displayName: string;
  sansName: string;
  category: "Serif classic" | "Modern sans" | "Editorial" | "Display" | "Techy" | "Warm";
  googleHref: string | null;
};

export const FONT_PRESETS: FontPreset[] = [
  {
    id: "playfair-inter",
    name: "Playfair × Inter (Default)",
    displayName: "Playfair Display",
    sansName: "Inter",
    category: "Serif classic",
    googleHref: null,
  },
  {
    id: "space-grotesk-dm-sans",
    name: "Space Grotesk × DM Sans",
    displayName: "Space Grotesk",
    sansName: "DM Sans",
    category: "Modern sans",
    googleHref:
      "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
  },
  {
    id: "syne-jakarta",
    name: "Syne × Plus Jakarta",
    displayName: "Syne",
    sansName: "Plus Jakarta Sans",
    category: "Display",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap",
  },
  {
    id: "instrument-serif-work-sans",
    name: "Instrument Serif × Work Sans",
    displayName: "Instrument Serif",
    sansName: "Work Sans",
    category: "Editorial",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600;700&display=swap",
  },
  {
    id: "dm-serif-fira-sans",
    name: "DM Serif × Fira Sans",
    displayName: "DM Serif Display",
    sansName: "Fira Sans",
    category: "Editorial",
    googleHref:
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fira+Sans:wght@400;500;600;700&display=swap",
  },
  {
    id: "cormorant-karla",
    name: "Cormorant × Karla",
    displayName: "Cormorant Garamond",
    sansName: "Karla",
    category: "Serif classic",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Karla:wght@400;500;600;700&display=swap",
  },
  {
    id: "lora-nunito-sans",
    name: "Lora × Nunito Sans",
    displayName: "Lora",
    sansName: "Nunito Sans",
    category: "Warm",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Nunito+Sans:wght@400;600;700&display=swap",
  },
  {
    id: "bebas-neue-barlow",
    name: "Bebas Neue × Barlow",
    displayName: "Bebas Neue",
    sansName: "Barlow",
    category: "Display",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap",
  },
  {
    id: "outfit-figtree",
    name: "Outfit × Figtree",
    displayName: "Outfit",
    sansName: "Figtree",
    category: "Modern sans",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap",
  },
  {
    id: "libre-baskerville-ibm-plex",
    name: "Libre Baskerville × IBM Plex",
    displayName: "Libre Baskerville",
    sansName: "IBM Plex Sans",
    category: "Editorial",
    googleHref:
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&display=swap",
  },
  {
    id: "fraunces-inter",
    name: "Fraunces × Inter",
    displayName: "Fraunces",
    sansName: "Inter",
    category: "Serif classic",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap",
  },
  {
    id: "manrope-manrope",
    name: "Manrope (mono-family)",
    displayName: "Manrope",
    sansName: "Manrope",
    category: "Modern sans",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
  },
  {
    id: "urbanist-epilogue",
    name: "Urbanist × Epilogue",
    displayName: "Urbanist",
    sansName: "Epilogue",
    category: "Modern sans",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700&family=Urbanist:wght@500;600;700;800&display=swap",
  },
  {
    id: "jetbrains-work-sans",
    name: "JetBrains Mono × Work Sans",
    displayName: "JetBrains Mono",
    sansName: "Work Sans",
    category: "Techy",
    googleHref:
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Work+Sans:wght@400;500;600;700&display=swap",
  },
  {
    id: "merriweather-source-sans",
    name: "Merriweather × Source Sans",
    displayName: "Merriweather",
    sansName: "Source Sans 3",
    category: "Warm",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Source+Sans+3:wght@400;500;600;700&display=swap",
  },
];

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
export const PALETTE_STORAGE_KEY = "ccm-palette";
export const FONT_STORAGE_KEY = "ccm-fontpair";
export const CUSTOM_PALETTE_STORAGE_KEY = "ccm-custom-palette";

// ---------------------------------------------------------------------------
// Palette lookups + apply
// ---------------------------------------------------------------------------
export function findPalette(id: string | null | undefined): PalettePreset | null {
  if (!id) return null;
  return PALETTE_PRESETS.find((p) => p.id === id) ?? null;
}

export function findFont(id: string | null | undefined): FontPreset | null {
  if (!id) return null;
  return FONT_PRESETS.find((f) => f.id === id) ?? null;
}

const PALETTE_KEYS = [
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "accent",
  "accent-foreground",
  "ring",
] as const;

export function applyPalette(palette: PalettePreset | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!palette) {
    PALETTE_KEYS.forEach((k) => root.style.removeProperty(`--${k}`));
    return;
  }
  const isDark = root.classList.contains("dark");
  const tokens = isDark ? palette.dark : palette.light;
  PALETTE_KEYS.forEach((k) => root.style.setProperty(`--${k}`, tokens[k]));
}

// ---------------------------------------------------------------------------
// Custom palette (hex color picker)
// ---------------------------------------------------------------------------
export type CustomPalette = {
  primary: string; // hex #RRGGBB
  secondary: string;
  accent: string;
};

export function readCustomPalette(): CustomPalette | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CUSTOM_PALETTE_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<CustomPalette>;
    if (isHex(p.primary) && isHex(p.secondary) && isHex(p.accent)) {
      return { primary: p.primary!, secondary: p.secondary!, accent: p.accent! };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeCustomPalette(p: CustomPalette | null): void {
  if (typeof window === "undefined") return;
  try {
    if (p) window.localStorage.setItem(CUSTOM_PALETTE_STORAGE_KEY, JSON.stringify(p));
    else window.localStorage.removeItem(CUSTOM_PALETTE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function applyCustomPalette(cp: CustomPalette | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!cp) {
    PALETTE_KEYS.forEach((k) => root.style.removeProperty(`--${k}`));
    return;
  }
  const pf = pickForeground(cp.primary);
  const sf = pickForeground(cp.secondary);
  const af = pickForeground(cp.accent);
  root.style.setProperty("--primary", cp.primary);
  root.style.setProperty("--primary-foreground", pf);
  root.style.setProperty("--secondary", cp.secondary);
  root.style.setProperty("--secondary-foreground", sf);
  root.style.setProperty("--accent", cp.accent);
  root.style.setProperty("--accent-foreground", af);
  root.style.setProperty("--ring", cp.primary);
}

// ---------------------------------------------------------------------------
// Font apply
// ---------------------------------------------------------------------------
const FONT_LINK_ID = "ccm-custom-font-link";

export function applyFont(font: FontPreset | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
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

// ---------------------------------------------------------------------------
// Color / accessibility utilities (WCAG 2.1)
// ---------------------------------------------------------------------------
export function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#([0-9a-fA-F]{6})$/.test(v);
}

export function normalizeHex(v: string): string | null {
  if (!v) return null;
  let s = v.trim();
  if (!s.startsWith("#")) s = "#" + s;
  if (/^#([0-9a-fA-F]{3})$/.test(s)) {
    const [, a, b, c] = s.match(/^#(.)(.)(.)$/)!;
    s = `#${a}${a}${b}${b}${c}${c}`;
  }
  return /^#([0-9a-fA-F]{6})$/.test(s) ? s.toLowerCase() : null;
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  return [
    parseInt(n.slice(1, 3), 16),
    parseInt(n.slice(3, 5), 16),
    parseInt(n.slice(5, 7), 16),
  ];
}

function srgbToLin(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(srgbToLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function pickForeground(bg: string): string {
  // Choose white or near-black based on which yields more contrast.
  const white = contrastRatio(bg, "#ffffff");
  const black = contrastRatio(bg, "#111111");
  return white >= black ? "#ffffff" : "#111111";
}

export function wcagLevel(ratio: number, largeText = false): "AAA" | "AA" | "AA Large" | "Fail" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (largeText && ratio >= 3) return "AA Large";
  return "Fail";
}

// Adjust a hex color's HSL lightness to reach a target contrast ratio against a bg.
export function suggestAccessible(fg: string, bg: string, target = 4.5): string {
  const rgb = hexToRgb(fg);
  if (!rgb) return fg;
  const [h, s] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const bgL = relativeLuminance(bg);
  // If bg is bright, push fg darker; if dim, push fg lighter.
  const direction = bgL > 0.5 ? -1 : 1;
  let bestHex = fg;
  let bestRatio = contrastRatio(fg, bg);
  for (let step = 1; step <= 100; step++) {
    const l = clamp(getHslL(rgb) + direction * step * 0.01, 0, 1);
    const [r, g, b] = hslToRgb(h, s, l);
    const hex = rgbToHex(r, g, b);
    const ratio = contrastRatio(hex, bg);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestHex = hex;
    }
    if (ratio >= target) return hex;
  }
  return bestHex;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getHslL(rgb: [number, number, number]): number {
  return rgbToHsl(rgb[0], rgb[1], rgb[2])[2];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Backgrounds used for contrast checks against the current theme.
export function currentThemeBackgrounds(): { bg: string; fg: string } {
  if (typeof document === "undefined") return { bg: "#ffffff", fg: "#111111" };
  const isDark = document.documentElement.classList.contains("dark");
  return isDark ? { bg: "#1c2320", fg: "#f2f0e8" } : { bg: "#fdfbf7", fg: "#2a2620" };
}
