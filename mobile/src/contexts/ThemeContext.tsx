import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readPreference, writePreference } from "../services/cache";
import { createStyles } from "../theme/styles";
import { isThemeName, themes, type ThemeName } from "../theme/colors";

const THEME_STORAGE_KEY = "systemic:accessibility:theme";

interface ThemeContextValue {
  theme: ThemeName;
  colors: (typeof themes)[ThemeName];
  styles: ReturnType<typeof createStyles>;
  ready: boolean;
  error: string;
  setTheme: (theme: ThemeName) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("light");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void readPreference<unknown>(THEME_STORAGE_KEY)
      .then((storedTheme) => {
        if (!active || storedTheme === null) return;
        if (!isThemeName(storedTheme)) {
          throw new Error("A preferência de tema salva não é válida.");
        }
        setThemeState(storedTheme);
      })
      .catch((reason: unknown) => {
        console.error("Não foi possível carregar o tema salvo.", reason);
        if (active) {
          setError(reason instanceof Error ? reason.message : "Não foi possível carregar o tema salvo.");
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback(async (nextTheme: ThemeName) => {
    setError("");
    try {
      await writePreference(THEME_STORAGE_KEY, nextTheme);
      setThemeState(nextTheme);
    } catch (reason) {
      console.error("Não foi possível salvar o tema selecionado.", reason);
      const message = reason instanceof Error ? reason.message : "Não foi possível salvar o tema selecionado.";
      setError(message);
      throw reason instanceof Error ? reason : new Error(message);
    }
  }, []);

  const value = useMemo(() => ({
    theme,
    colors: themes[theme],
    styles: createStyles(themes[theme]),
    ready,
    error,
    setTheme,
  }), [error, ready, setTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme deve ser usado dentro de ThemeProvider.");
  return context;
}
