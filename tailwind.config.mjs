/**
 * Tailwind CSS configuration
 *
 * We explicitly enable class-based dark mode so that the `dark:`
 * variants respond to the `.dark` class we toggle in ThemeContext.
 *
 * Without this, Tailwind uses the `media` strategy by default
 * (prefers-color-scheme), so the app would stay in the system
 * color scheme regardless of our custom theme toggle.
 */

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: "class",
};

export default config;
