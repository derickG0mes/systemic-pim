import { createContext } from "react";

export type AccessibilityContextType = {
  vlibrasEnabled: boolean;
  setVlibrasEnabled: (enabled: boolean) => void;
};

export const AccessibilityContext =
  createContext<AccessibilityContextType | undefined>(undefined);
