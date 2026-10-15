/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /**
         * A színrendszer a VALÓDI márkapalettára épül.
         *
         * Eddig a `brand` skála a gyári Tailwind zöld volt, a szürkék a gyári,
         * kékes Tailwind-szürkék — ettől nézett ki az oldal úgy, mint bármelyik
         * Tailwind-sablon. A márkaszínek (#187f3b, #b9e6c9 …) csak mellékes
         * tokenként éltek.
         *
         * A skálák cseréje a meglévő ~4400 osztályt egyszerre, következetesen
         * állítja át — egyenkénti átírásnál előbb-utóbb kimaradna valami.
         *
         * KONTRASZT (fehér szöveg a háttéren / szín szövegként fehéren):
         *   brand-500  4.57  — korábban 2.28, a WCAG 4.5-ös minimuma alatt:
         *                      a fő „Keresés" gomb szövege nehezen volt olvasható.
         *   brand-600  5.08  (= forest, a fő márkaszín)
         *   brand-700  6.70  (elsődleges gomb)
         *   gray-500   4.88  (másodlagos szöveg)
         */
        brand: {
          50:  "#f2f8f4",
          100: "#e1f1e6",
          200: "#b9e6c9", // = mint
          300: "#86cf9f",
          400: "#4caf6f",
          500: "#1c8741",
          600: "#187f3b", // = forest
          700: "#136a31",
          800: "#10552a",
          900: "#0d4522",
          950: "#072613",
        },
        /**
         * Semleges skála a grafitból (#202522) levezetve: enyhén zöldes-meleg,
         * nem a gyári kékes-hideg szürke. Ugyanazok a fokozatok, így a
         * meglévő `gray-*` osztályok jelentése (világos háttér, másodlagos
         * szöveg, keret) nem változik — csak a tónusuk illeszkedik a márkához.
         */
        gray: {
          50:  "#f6f7f6",
          100: "#eef0ee",
          200: "#e0e3e0",
          300: "#c8cdc9",
          400: "#9ba29d",
          500: "#6b736e",
          600: "#4f5752",
          700: "#3a413c",
          800: "#2a302c",
          900: "#202522", // = graphite
          950: "#111412",
        },
        // A `green-*` osztályokat (241 db, főleg „aktív/sikeres" jelzések)
        // ugyanarra a zöldre irányítjuk: két különböző zöld egymás mellett
        // pont a sablonos, összerakott hatást keltené.
        green: {} /* lent töltjük ki a brand skálával */,

        // A márkapaletta nevesített tokenjei (a platformdíj-oldalak használják).
        forest:   "#187f3b",
        mint:     "#b9e6c9",
        cream:    "#fff8ee",
        graphite: "#202522",
        apricot:  "#ff9b61", // csak kis akcentus
      },
      fontFamily: {
        sans:    ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

// A `green` ugyanaz a skála, mint a `brand` — lásd fent.
config.theme.extend.colors.green = config.theme.extend.colors.brand;

module.exports = config;
