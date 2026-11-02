import { createContext } from "react";

export const FONT_SIZE_LEVELS = [90, 100, 125, 150] as const;
export type FontSizeScale = (typeof FONT_SIZE_LEVELS)[number];
export type AccessibilityTheme = "light" | "dark" | "high-contrast";

export type AccessibilityContextType = {
  vlibrasEnabled: boolean;
  setVlibrasEnabled: (enabled: boolean) => void;
  fontSizeScale: FontSizeScale;
  setFontSizeScale: (scale: FontSizeScale) => void;
  theme: AccessibilityTheme;
  setTheme: (theme: AccessibilityTheme) => void;
};

export const AccessibilityContext =
  createContext<AccessibilityContextType | undefined>(undefined);
