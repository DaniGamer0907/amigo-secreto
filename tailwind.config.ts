/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#132420",
        "ink-deep": "#0C1A16",
        paper: "#F7ECD8",
        "paper-shade": "#ECDCBB",
        "paper-line": "rgba(42,32,20,0.22)",
        "text-ink": "#2B2318",
        "text-soft": "#6B5F4C",
        cranberry: "#C1392B",
        "cranberry-dark": "#93291E",
        marigold: "#E8A33D",
        "marigold-dark": "#B87A1F",
        focus: "#7FB6A8",
      },
      fontFamily: {
        fraunces: ["'Fraunces', serif"],
        "work-sans": ["'Work Sans', sans-serif"],
        "space-mono": ["'Space Mono', monospace"],
      },
    },
  },
  plugins: [],
};
