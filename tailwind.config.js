/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0f1c", // Deep Navy
        border: "#1f2937",
      },
    },
  },
  plugins: [],
};
