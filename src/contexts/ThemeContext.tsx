"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "default" | "dark-sidebar";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("default");
  const [isLoaded, setIsLoaded] = useState(false);

  // 从 localStorage 加载主题偏好
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") as ThemeMode | null;
    if (savedTheme === "dark-sidebar" || savedTheme === "default") {
      setThemeState(savedTheme);
    }
    setIsLoaded(true);
  }, []);

  // 保存主题偏好到 localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("app-theme", theme);
      // 更新 HTML class 以支持全局样式
      document.documentElement.classList.toggle("dark-sidebar", theme === "dark-sidebar");
    }
  }, [theme, isLoaded]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "default" ? "dark-sidebar" : "default"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
