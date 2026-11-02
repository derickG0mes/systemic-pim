import React, { useEffect, useState } from "react";
import {
  AccessibilityContext,
  FONT_SIZE_LEVELS,
  type AccessibilityTheme,
  type FontSizeScale,
} from "@/contexts/accessibility-context";

const VLibras_STORAGE_KEY = "systemic:accessibility:vlibras";
const FONT_SIZE_STORAGE_KEY = "systemic:accessibility:font-size";
const THEME_STORAGE_KEY = "systemic:accessibility:theme";

function getStoredFontSize(): FontSizeScale {
  if (typeof window === "undefined") return 100;
  const stored = Number(window.localStorage.getItem(FONT_SIZE_STORAGE_KEY));
  return FONT_SIZE_LEVELS.find((level) => level === stored) ?? 100;
}

function getStoredTheme(): AccessibilityTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "high-contrast" ? stored : "light";
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [vlibrasEnabled, setVlibrasEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(VLibras_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });
  const [fontSizeScale, setFontSizeScale] = useState<FontSizeScale>(getStoredFontSize);
  const [theme, setTheme] = useState<AccessibilityTheme>(getStoredTheme);

  const setVlibrasEnabled = (enabled: boolean) => {
    setVlibrasEnabledState(enabled);
    localStorage.setItem(VLibras_STORAGE_KEY, String(enabled));
  };

  useEffect(() => {
    localStorage.setItem(VLibras_STORAGE_KEY, String(vlibrasEnabled));
  }, [vlibrasEnabled]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${fontSizeScale}%`;
    root.classList.toggle("theme-dark", theme === "dark");
    root.classList.toggle("theme-high-contrast", theme === "high-contrast");
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(fontSizeScale));
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [fontSizeScale, theme]);

  return (
    <AccessibilityContext.Provider
      value={{
        vlibrasEnabled,
        setVlibrasEnabled,
        fontSizeScale,
        setFontSizeScale,
        theme,
        setTheme,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}
