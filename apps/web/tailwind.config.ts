import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui"],
        body: ["'Work Sans'", "ui-sans-serif", "system-ui"],
      },
      colors: {
        ink: "#0f172a",
        fog: "#f1f5f9",
        accent: "#06b6d4",
        sand: "#f59e0b",
        moss: "#10b981",
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(circle at top left, rgba(6,182,212,0.35), transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,158,11,0.25), transparent 45%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
