import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"] },
      colors: {
        brand: {
          50: "#f3f1ff",
          100: "#e9e5ff",
          200: "#d3cbff",
          300: "#b3a5ff",
          400: "#947eff",
          500: "#7c5cfa",
          600: "#6a40ef",
          700: "#5a30d4",
          800: "#4a2aac",
          900: "#3d2788",
        },
        ink: { 900: "#161a2b", 700: "#3a4057", 500: "#6b7290", 400: "#8f95b0", 300: "#b9bdd0", 200: "#e3e5ee", 100: "#f0f1f7", 50: "#f7f8fc" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,26,43,.04), 0 8px 24px -8px rgba(22,26,43,.08)",
        pop: "0 12px 40px -8px rgba(22,26,43,.25)",
      },
    },
  },
  plugins: [],
};
export default config;
