"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Theme Toggle Component - Demonstrates ShadCN dark mode functionality
 * with proper theme switching and CSS variable updates
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if dark mode is preferred on mount
    const isDarkPreferred = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark" || (!savedTheme && isDarkPreferred)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);

    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={toggleTheme} className="fixed top-4 right-4 z-50">
      {isDark ? "☀️ Light" : "🌙 Dark"}
    </Button>
  );
}
