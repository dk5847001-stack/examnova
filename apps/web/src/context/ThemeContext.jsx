import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "examnova_theme";
const THEMES = {
  DARK: "dark",
  LIGHT: "light",
};

function resolveInitialTheme() {
  if (typeof window === "undefined") {
    return THEMES.DARK;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === THEMES.DARK || storedTheme === THEMES.LIGHT) {
      return storedTheme;
    }
  } catch {
    // Fall back to system preference when storage access is blocked.
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? THEMES.LIGHT : THEMES.DARK;
}

function applyDocumentTheme(theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    applyDocumentTheme(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore persistence failures and keep the in-memory theme active.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK));
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDarkTheme: theme === THEMES.DARK,
        isLightTheme: theme === THEMES.LIGHT,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }

  return context;
}
