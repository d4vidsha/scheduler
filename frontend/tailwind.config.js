/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme")
export default {
  darkMode: ["selector"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  prefix: "",
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
        sans: ["Inter var", ...defaultTheme.fontFamily.sans],
        headline: ["Inter var", ...defaultTheme.fontFamily.sans],
        body: ["Inter var", ...defaultTheme.fontFamily.sans],
        label: ["Inter var", ...defaultTheme.fontFamily.sans],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        // Design system surface hierarchy (CSS vars for dark mode support)
        surface: "var(--ds-surface)",
        "surface-dim": "var(--ds-surface-container-high)",
        "surface-bright": "var(--ds-surface)",
        "surface-container-lowest": "var(--ds-surface-container-lowest)",
        "surface-container-low": "var(--ds-surface-container-low)",
        "surface-container": "var(--ds-surface-container)",
        "surface-container-high": "var(--ds-surface-container-high)",
        "surface-container-highest": "var(--ds-surface-container-highest)",
        "surface-variant": "var(--ds-surface-container-highest)",

        // On-surface text colors
        "on-surface": "var(--ds-on-surface)",
        "on-surface-variant": "var(--ds-on-surface-variant)",

        // Primary
        primary: {
          DEFAULT: "var(--ds-primary)",
          foreground: "#ffffff",
          container: "var(--ds-primary-container)",
          fixed: "#d8e2ff",
          "fixed-dim": "#adc6ff",
        },
        "on-primary": "#ffffff",
        "on-primary-container": "var(--ds-on-primary-container)",
        "on-primary-fixed": "#001a41",
        "on-primary-fixed-variant": "#004493",

        // Secondary
        secondary: {
          DEFAULT: "#5a5f66",
          foreground: "#ffffff",
          container: "var(--ds-surface-container-highest)",
          fixed: "#dee3eb",
          "fixed-dim": "#c2c7cf",
        },
        "on-secondary": "#ffffff",
        "on-secondary-container": "#60656c",
        "on-secondary-fixed": "#171c22",
        "on-secondary-fixed-variant": "#42474e",

        // Tertiary
        tertiary: {
          DEFAULT: "#005395",
          container: "#006cbe",
          fixed: "#d3e4ff",
          "fixed-dim": "#a2c9ff",
        },
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#e2ecff",
        "on-tertiary-fixed": "#001c38",
        "on-tertiary-fixed-variant": "#004882",

        // Error
        error: {
          DEFAULT: "var(--ds-error)",
          container: "#ffdad6",
        },
        "on-error": "#ffffff",
        "on-error-container": "#93000a",

        // Outline
        outline: "#727785",
        "outline-variant": "var(--ds-outline-variant)",

        // Inverse
        "inverse-surface": "#2c3137",
        "inverse-on-surface": "#edf1f9",
        "inverse-primary": "#adc6ff",

        // Surface tint
        "surface-tint": "#005bc0",

        // Legacy shadcn compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
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
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        ambient: "0 12px 32px rgba(23, 28, 34, 0.06)",
        "ambient-lg": "0 16px 48px rgba(23, 28, 34, 0.08)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(0, 79, 168, 0.5)" },
          "50%": { boxShadow: "0 0 16px rgba(0, 79, 168, 0.8)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("tailwindcss-animate")],
}
