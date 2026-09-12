/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
      },
      colors: {
        // StudyAsan Brand Colors
        saBlue: "#0276D3",
        saBlueDarkHover: "#025AA3",
        saBlueLight: "#5BAEF0",
        saBlueMid: "#1a8de8",
        saBlueSubtle: "#EBF4FD",      // Very light blue for tinted backgrounds
        saVividOrange: "#FF7A00",
        saOrangeDark: "#E06500",       // Darker orange for pressed/shadow states
        saOrangeLight: "#FFA048",      // Lighter orange for hover glows
        saOrangeSubtle: "#FFF5ED",    // Very light orange for tinted backgrounds
        saSurface: "#F8FAFD",         // Page background tint
        // end of custom colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: "fadeIn 0.2s ease-out",
        fadeUp: "fadeUp 0.3s ease-out both",
        slideInLeft: "slideInLeft 0.25s ease-out both",
        scaleIn: "scaleIn 0.2s ease-out both",
        shimmer: "shimmer 1.4s infinite linear",
      },
      boxShadow: {
        "blue-glow": "0 0 0 3px rgba(2, 118, 211, 0.18)",
        "orange-glow": "0 0 0 3px rgba(236, 162, 9, 0.22)",
        card: "0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
