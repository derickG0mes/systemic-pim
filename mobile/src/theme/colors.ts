export type ThemeName = "light" | "dark" | "high-contrast";

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  primaryForeground: string;
  primaryBright: string;
  primarySoft: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  destructive: string;
  destructiveForeground: string;
  destructiveSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  info: string;
  sidebar: string;
  sidebarAccent: string;
  sidebarBorder: string;
  white: string;
  shadow: string;
  overlay: string;
  chart: readonly string[];
}

export const themeNames: readonly ThemeName[] = ["light", "dark", "high-contrast"];

export const themes: Record<ThemeName, ThemeColors> = {
  light: {
    background: "#F6F7F9",
    foreground: "#131720",
    card: "#FFFFFF",
    primary: "#A94904",
    primaryForeground: "#FFFFFF",
    primaryBright: "#F98118",
    primarySoft: "#FEF0E6",
    secondary: "#E8EAED",
    secondaryForeground: "#131720",
    muted: "#F0F2F4",
    mutedForeground: "#575E6B",
    border: "#E2E4E9",
    destructive: "#CE1212",
    destructiveForeground: "#FFFFFF",
    destructiveSoft: "#FCE8E8",
    success: "#137136",
    successSoft: "#E8F5EC",
    warning: "#895906",
    info: "#0950C3",
    sidebar: "#171C26",
    sidebarAccent: "#222A39",
    sidebarBorder: "#29303D",
    white: "#FFFFFF",
    shadow: "#000000",
    overlay: "rgba(0, 0, 0, 0.45)",
    chart: ["#F97415", "#21C45D", "#3C83F6", "#AF57DB", "#EF4343"],
  },
  dark: {
    background: "#101319",
    foreground: "#F1F2F4",
    card: "#181C25",
    primary: "#F98118",
    primaryForeground: "#131720",
    primaryBright: "#FF9A3D",
    primarySoft: "#482711",
    secondary: "#303743",
    secondaryForeground: "#F1F2F4",
    muted: "#222832",
    mutedForeground: "#B9C1D0",
    border: "#414957",
    destructive: "#FF7777",
    destructiveForeground: "#131720",
    destructiveSoft: "#4B2529",
    success: "#69D391",
    successSoft: "#193B2A",
    warning: "#FFD166",
    info: "#78B7FF",
    sidebar: "#0C1017",
    sidebarAccent: "#1B2230",
    sidebarBorder: "#333B4A",
    white: "#FFFFFF",
    shadow: "#000000",
    overlay: "rgba(0, 0, 0, 0.65)",
    chart: ["#FF9A3D", "#69D391", "#78B7FF", "#D89CFF", "#FF7777"],
  },
  "high-contrast": {
    background: "#000000",
    foreground: "#FFFFFF",
    card: "#000000",
    primary: "#FFFF00",
    primaryForeground: "#000000",
    primaryBright: "#FFFF00",
    primarySoft: "#262600",
    secondary: "#FFFFFF",
    secondaryForeground: "#000000",
    muted: "#000000",
    mutedForeground: "#FFFF00",
    border: "#FFFFFF",
    destructive: "#FFFF00",
    destructiveForeground: "#000000",
    destructiveSoft: "#262600",
    success: "#FFFF00",
    successSoft: "#262600",
    warning: "#FFFF00",
    info: "#FFFF00",
    sidebar: "#000000",
    sidebarAccent: "#000000",
    sidebarBorder: "#FFFFFF",
    white: "#FFFFFF",
    shadow: "#000000",
    overlay: "rgba(0, 0, 0, 0.75)",
    chart: ["#FFFF00", "#FFFFFF", "#FFFF00", "#FFFFFF", "#FFFF00"],
  },
};

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && themeNames.includes(value as ThemeName);
}
