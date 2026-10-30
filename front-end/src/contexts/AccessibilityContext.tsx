import React, { useEffect, useState } from "react";
import { AccessibilityContext } from "@/contexts/accessibility-context";

const STORAGE_KEY = "systemic:accessibility:vlibras";

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [vlibrasEnabled, setVlibrasEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  const setVlibrasEnabled = (enabled: boolean) => {
    setVlibrasEnabledState(enabled);
    localStorage.setItem(STORAGE_KEY, String(enabled));
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(vlibrasEnabled));
  }, [vlibrasEnabled]);

  return (
    <AccessibilityContext.Provider value={{ vlibrasEnabled, setVlibrasEnabled }}>
      {children}
    </AccessibilityContext.Provider>
  );
}
