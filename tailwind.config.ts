import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "Roboto", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Archivo Narrow'", "Pretendard", "sans-serif"],
      },
      colors: {
        ace: {
          charcoal: "#231F20",
          orange: "#FF944C",
          "orange-hover": "#E57E37",
          ivory: "#FAF9F7",
          paper: "#FFFFFF",
          cement: "#E5E5E5",
          muted: "#7E7577",
          border: "#231F20",
          success: "#10B981",
          error: "#EF4444",
        },
      },
      boxShadow: {
        brutalist: "3px 3px 0px 0px #231F20",
        "brutalist-sm": "2px 2px 0px 0px #231F20",
        "brutalist-lg": "5px 5px 0px 0px #231F20",
      },
      borderWidth: {
        '2': '2px',
        '3': '3px',
      }
    },
  },
  plugins: [],
};

export default config;
