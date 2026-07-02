export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"]
      },
      colors: {
        // New palette — strictly 4 colors
        void:    "#091413",   // deepest background
        forest:  "#285A48",   // panels / borders
        teal:    "#408A71",   // interactive / mid
        mint:    "#B0E4CC",   // highlight / accent text
      },
      animation: {
        "blob": "blob 12s infinite alternate",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        blob: {
          "0%":   { transform: "translate(0px,   0px)   scale(1)"   },
          "33%":  { transform: "translate(30px, -50px)  scale(1.1)" },
          "66%":  { transform: "translate(-20px, 20px)  scale(0.9)" },
          "100%": { transform: "translate(0px,   0px)   scale(1)"   }
        }
      }
    }
  },
  plugins: []
};
