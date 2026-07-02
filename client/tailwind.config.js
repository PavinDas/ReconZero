export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"]
      },
      colors: {
        ink: "#050806",
        panel: "#09110c",
        line: "#193323",
        acid: "#62ff8e",
        dim: "#76a584",
        warn: "#ffd166",
        bad: "#ff5f6d"
      }
    }
  },
  plugins: []
};
