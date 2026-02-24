/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      sans: ['Geist', 'sans-serif'],
      mono: ['"Geist Mono"', 'monospace'],
      display: ['"Instrument Serif"', 'serif'],
    },
    extend: {
      colors: {
        background: "var(--navy)",
        border: "var(--border)",
      },
    },
  },
  plugins: [],
};
