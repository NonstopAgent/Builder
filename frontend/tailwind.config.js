/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0b1220",
        "panel-dark": "#0f172a",
        "panel-darker": "#0b1020",
        neon: "#6dd3ff",
      },
      boxShadow: {
        glow: "0 0 35px rgba(109, 211, 255, 0.25)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
