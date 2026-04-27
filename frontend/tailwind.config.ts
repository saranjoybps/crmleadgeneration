import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f8ff",
          100: "#e7eeff",
          200: "#cfddff",
          300: "#a9c1ff",
          400: "#7a9dff",
          500: "#5478f4",
          600: "#3f5fd9",
          700: "#334cad",
          800: "#2e418b",
          900: "#293b72"
        }
      }
    }
  },
  plugins: []
};

export default config;

