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
        // A megadott márkapaletta. Külön tokenek, nem a `brand` skála
        // felülírása: azt több száz meglévő osztály használja, és az
        // átszínezésük nem ennek a feladatnak a dolga.
        forest:   "#187f3b", // fő zöld
        mint:     "#b9e6c9",
        cream:    "#fff8ee",
        graphite: "#202522",
        apricot:  "#ff9b61", // csak kis akcentus
        brand: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
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
