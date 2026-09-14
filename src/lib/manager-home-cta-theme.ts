export type ManagerHomeCtaThemeId =
  | "salon-classic"
  | "unified-emerald"
  | "brand-floor"
  | "sky-upsell"
  | "soft-minimal"
  | "icon-pulse"
  | "aurora-lab"
  | "midnight-emerald"
  | "obsidian-gold"
  | "velvet-noir"
  | "champagne-luxe"
  | "slate-cyan-edge"
  | "rose-gold-dusk"
  | "navy-coral-pulse"
  | "forest-deep"
  | "platinum-light"
  | "copper-forge"
  | "wine-cellar"
  | "carbon-neon-trio"
  | "pearl-charcoal";

export type ManagerHomeCtaThemeOption = {
  id: ManagerHomeCtaThemeId;
  label: string;
  hint: string;
};

export const MANAGER_HOME_CTA_THEME_STORAGE_KEY = "manager-home-cta-theme-v2";

export const MANAGER_HOME_CTA_THEMES: ManagerHomeCtaThemeOption[] = [
  {
    id: "salon-classic",
    label: "01 · Salon classic",
    hint: "Light cards · emerald / brand / sky accents",
  },
  {
    id: "midnight-emerald",
    label: "02 · Midnight emerald",
    hint: "Dark walk-in · light member & package · green shimmer",
  },
  {
    id: "obsidian-gold",
    label: "03 · Obsidian gold",
    hint: "Deep charcoal · gold sweep on all three",
  },
  {
    id: "velvet-noir",
    label: "04 · Velvet noir",
    hint: "Dark plum walk · brand glow · sky package",
  },
  {
    id: "champagne-luxe",
    label: "05 · Champagne luxe",
    hint: "Warm dark walk · champagne shimmer trio",
  },
  {
    id: "unified-emerald",
    label: "06 · Unified emerald",
    hint: "Light surface · same emerald motion everywhere",
  },
  {
    id: "brand-floor",
    label: "07 · Brand floor",
    hint: "Light cards · hero brand pulse on all",
  },
  {
    id: "slate-cyan-edge",
    label: "08 · Slate cyan edge",
    hint: "Dark slate walk · cyan edge light · soft quick actions",
  },
  {
    id: "rose-gold-dusk",
    label: "09 · Rose gold dusk",
    hint: "Dark rose walk · gold member · light sky package",
  },
  {
    id: "navy-coral-pulse",
    label: "10 · Navy coral pulse",
    hint: "Navy dark · coral ring pulse · animated package",
  },
  {
    id: "forest-deep",
    label: "11 · Forest deep",
    hint: "Forest dark walk · emerald light duo below",
  },
  {
    id: "platinum-light",
    label: "12 · Platinum light",
    hint: "All light · charcoal type · silver shimmer",
  },
  {
    id: "copper-forge",
    label: "13 · Copper forge",
    hint: "Dark copper walk · cream member · sky package",
  },
  {
    id: "wine-cellar",
    label: "14 · Wine cellar",
    hint: "Burgundy dark member · light walk & package",
  },
  {
    id: "carbon-neon-trio",
    label: "15 · Carbon neon trio",
    hint: "Near-black cards · neon green / brand / cyan slots",
  },
  {
    id: "pearl-charcoal",
    label: "16 · Pearl charcoal",
    hint: "Pearl light walk · dark charcoal upsell row",
  },
  {
    id: "sky-upsell",
    label: "17 · Sky upsell focus",
    hint: "Quiet walk & member · sky animation on package only",
  },
  {
    id: "aurora-lab",
    label: "18 · Aurora lab",
    hint: "Light walk · cyan+violet package aurora",
  },
  {
    id: "icon-pulse",
    label: "19 · Icon pulse",
    hint: "Light calm surfaces · strong icon ring pulse",
  },
  {
    id: "soft-minimal",
    label: "20 · Soft minimal",
    hint: "No motion · flat premium borders",
  },
];

export const DEFAULT_MANAGER_HOME_CTA_THEME: ManagerHomeCtaThemeId = "salon-classic";

export function isManagerHomeCtaThemeId(value: string): value is ManagerHomeCtaThemeId {
  return MANAGER_HOME_CTA_THEMES.some((t) => t.id === value);
}

/** Accept v1 storage ids that were renamed or removed. */
export function normalizeManagerHomeCtaTheme(stored: string | null): ManagerHomeCtaThemeId {
  if (stored && isManagerHomeCtaThemeId(stored)) return stored;
  return DEFAULT_MANAGER_HOME_CTA_THEME;
}
