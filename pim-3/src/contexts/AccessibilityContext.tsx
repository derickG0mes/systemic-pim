import React, { createContext, useContext, useEffect, useState } from "react";

type AccessibilityContextType = {
  vlibrasEnabled: boolean;
  setVlibrasEnabled: (enabled: boolean) => void;
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

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

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
