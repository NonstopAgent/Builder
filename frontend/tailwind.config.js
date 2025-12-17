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
        "editor-bg": "#1e1e1e",
      },
      boxShadow: {
        glow: "0 0 35px rgba(109, 211, 255, 0.25)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      typography: {
        invert: {
          css: {
            '--tw-prose-body': 'rgb(226 232 240)',
            '--tw-prose-headings': 'rgb(248 250 252)',
            '--tw-prose-links': 'rgb(56 189 248)',
            '--tw-prose-bold': 'rgb(248 250 252)',
            '--tw-prose-code': 'rgb(125 211 252)',
            '--tw-prose-pre-bg': 'rgb(15 23 42)',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
