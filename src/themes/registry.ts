import type { SkinId } from "../lib/theme";
import type { TranslationKey } from "../lib/i18n";

export type ThemeGroup = "recommended" | "classic" | "scene";

export interface ThemeDefinition {
  id: SkinId;
  group: ThemeGroup;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  mode: "light" | "dark";
  preview?: string;
  swatches: [string, string, string, string];
}

export const THEME_REGISTRY: readonly ThemeDefinition[] = [
  {
    id: "glass",
    group: "recommended",
    labelKey: "skinGlass",
    descriptionKey: "themeGlassDescription",
    mode: "dark",
    swatches: ["#11172b", "rgba(255,255,255,0.14)", "#f6f7fc", "#38bdf8"],
  },
  {
    id: "illustrated",
    group: "recommended",
    labelKey: "skinIllustrated",
    descriptionKey: "themeIllustratedDescription",
    mode: "light",
    preview: "/themes/illustrated.svg",
    swatches: ["#f5f1e8", "#e7eef7", "#26333f", "#5b8def"],
  },
  {
    id: "graphite",
    group: "recommended",
    labelKey: "skinGraphite",
    descriptionKey: "themeGraphiteDescription",
    mode: "dark",
    swatches: ["#171b1f", "#252b31", "#eff2f5", "#e7a83c"],
  },
  {
    id: "mint",
    group: "recommended",
    labelKey: "skinMint",
    descriptionKey: "themeMintDescription",
    mode: "light",
    swatches: ["#effaf4", "#def4e7", "#264739", "#10b590"],
  },
  {
    id: "default",
    group: "classic",
    labelKey: "skinDefault",
    descriptionKey: "themeDefaultDescription",
    mode: "light",
    swatches: ["#f9fafb", "#ffffff", "#111827", "#2563eb"],
  },
  {
    id: "aurora",
    group: "classic",
    labelKey: "skinAurora",
    descriptionKey: "themeAuroraDescription",
    mode: "dark",
    swatches: ["#071117", "#10232c", "#eaf2f5", "#1ec291"],
  },
  {
    id: "cyberpunk",
    group: "classic",
    labelKey: "skinCyberpunk",
    descriptionKey: "themeCyberpunkDescription",
    mode: "dark",
    swatches: ["#0a0f14", "#141d29", "#f5f7ff", "#f6d365"],
  },
  {
    id: "minecraft",
    group: "classic",
    labelKey: "skinMinecraft",
    descriptionKey: "themeMinecraftDescription",
    mode: "light",
    swatches: ["#fff7c9", "#f0c84b", "#281f10", "#2f9f52"],
  },
  {
    id: "mcwood",
    group: "classic",
    labelKey: "skinMcWood",
    descriptionKey: "themeMcWoodDescription",
    mode: "dark",
    swatches: ["#4a2a12", "#e8d29a", "#3f8f3a", "#2f6fd0"],
  },
  {
    id: "anime-sunset",
    group: "scene",
    labelKey: "skinAnimeSunset",
    descriptionKey: "themeAnimeSunsetDescription",
    mode: "dark",
    preview: "/themes/twilight.png",
    swatches: ["#2b1d2f", "#f28b64", "#40536d", "#ffc989"],
  },
  {
    id: "anime-neon",
    group: "scene",
    labelKey: "skinAnimeNeon",
    descriptionKey: "themeAnimeNeonDescription",
    mode: "dark",
    preview: "/themes/neon.png",
    swatches: ["#11172e", "#241b3f", "#e9e4ff", "#22e7ff"],
  },
  {
    id: "anime-forest",
    group: "scene",
    labelKey: "skinAnimeForest",
    descriptionKey: "themeAnimeForestDescription",
    mode: "dark",
    preview: "/themes/forest.png",
    swatches: ["#c0e8c2", "#f2d4a8", "#456c50", "#f7c25e"],
  },
  {
    id: "anime-stars",
    group: "scene",
    labelKey: "skinAnimeStars",
    descriptionKey: "themeAnimeStarsDescription",
    mode: "dark",
    preview: "/themes/stars.png",
    swatches: ["#08142f", "#27333f", "#cfe4ff", "#8cd2e8"],
  },
];

export const THEME_GROUPS: readonly { id: ThemeGroup; labelKey: TranslationKey }[] = [
  { id: "recommended", labelKey: "themeGroupRecommended" },
  { id: "classic", labelKey: "themeGroupClassic" },
  { id: "scene", labelKey: "themeGroupScene" },
];

export function getThemeDefinition(skinId: SkinId): ThemeDefinition {
  return THEME_REGISTRY.find((theme) => theme.id === skinId) ?? THEME_REGISTRY[4];
}