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
        primary: "#1A2B6D",
        secondary: "#00B8A0",
        accent: "#F5A623",
        danger: "#E8604C",
        background: "#0D1B2A",
        surface: "#1A2B6D",
        "text-primary": "#FFFFFF",
        "text-secondary": "#94A3B8",
        foreground: "#FFFFFF",
      },
      boxShadow: {
        soft: "0 20px 45px rgba(26, 82, 118, 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
