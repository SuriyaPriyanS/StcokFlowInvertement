import React, { createContext, useContext, useState, useEffect } from "react";

const THEMES = [
  { id: "navy", name: "Corporate Navy", primary: "#2563eb", sidebarBg: "#0f1d35", isDark: false },
  { id: "amber", name: "Midnight Amber", primary: "#f59e0b", sidebarBg: "#0f172a", isDark: true },
  { id: "emerald", name: "Emerald Forest", primary: "#10b981", sidebarBg: "#062820", isDark: true },
  { id: "violet", name: "Royal Violet", primary: "#a855f7", sidebarBg: "#170b2c", isDark: true },
  { id: "crimson", name: "Crimson Ruby", primary: "#f43f5e", sidebarBg: "#1f0b11", isDark: true },
  { id: "cyan", name: "Cyber Cyan", primary: "#06b6d4", sidebarBg: "#06252b", isDark: true },
  { id: "nordic", name: "Nordic Clean Light", primary: "#0284c7", sidebarBg: "#ffffff", isDark: false },
];

const FONTS = [
  { id: "Inter", name: "Inter", fontClass: "font-inter" },
  { id: "Outfit", name: "Outfit", fontClass: "font-outfit" },
  { id: "Plus Jakarta Sans", name: "Jakarta", fontClass: "font-jakarta" },
  { id: "Roboto", name: "Roboto", fontClass: "font-roboto" },
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("stockflow_theme") || "navy");
  const [font, setFont] = useState(() => localStorage.getItem("stockflow_font") || "Inter");

  useEffect(() => {
    localStorage.setItem("stockflow_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("stockflow_font", font);
    const fontObj = FONTS.find((f) => f.id === font);
    document.body.className = `${fontObj ? fontObj.fontClass : "font-inter"} h-full antialiased transition-colors duration-200`;
  }, [font]);

  const activeTheme = THEMES.find((t) => t.id === theme) || THEMES[0];
  const activeFont = FONTS.find((f) => f.id === font) || FONTS[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        font,
        setFont,
        activeTheme,
        activeFont,
        themes: THEMES,
        fonts: FONTS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
