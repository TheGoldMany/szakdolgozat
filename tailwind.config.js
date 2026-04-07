/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fdf6ee",
          100: "#fae8d0",
          200: "#f5d0a0",
          300: "#efb36a",
          400: "#e8923c",
          500: "#e27520",
          600: "#c75c17",
          700: "#a54416",
          800: "#85371a",
          900: "#6d2f18",
          950: "#3b150a",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
