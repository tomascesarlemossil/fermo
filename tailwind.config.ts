import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identidade visual Fermo
        espresso: "#161009",
        esp2: "#201710",
        gold: "#C79A4B",
        goldhi: "#E7C880",
        sela: "#B26B2E",
        osso: "#F4EFE6",
        bone: "#FBF7F0",
        ink: "#211B14",
        muted: "#6E6356",
        line: "#E6DDCF",
        danger: "#B0402F",
        dangerbg: "#F7E9E5",
        success: "#4F7A4A",
      },
      fontFamily: {
        cinzel: ["'Cinzel'", "Georgia", "serif"],
        cormorant: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
