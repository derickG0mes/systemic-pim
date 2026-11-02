import { useContext } from "react";
import { AccessibilityContext } from "@/contexts/accessibility-context";

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
