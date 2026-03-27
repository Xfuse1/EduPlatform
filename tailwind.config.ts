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
        primary: "#1A5276",
        secondary: "#2E86C1",
        accent: "#D4AF37",
        background: "#F7FAFC",
        foreground: "#102A43",
      },
      boxShadow: {
        soft: "0 20px 45px rgba(26, 82, 118, 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
