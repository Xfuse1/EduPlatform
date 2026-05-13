import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Cairo", "Tajawal", "sans-serif"],
      },
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-teal)",
        accent: "var(--color-gold)",
        danger: "var(--color-danger)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        /* Static semi-transparent tokens for glassmorphism components */
        "border-soft": "rgba(255,255,255,0.08)",
      },
      boxShadow: {
        soft: "0 20px 45px rgba(26, 82, 118, 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
