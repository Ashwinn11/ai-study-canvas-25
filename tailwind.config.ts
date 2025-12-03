import type { Config } from "tailwindcss";

export default {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
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
        sans: ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'display-large': ['36px', { lineHeight: '40px', fontWeight: '700' }],
        'display-medium': ['32px', { lineHeight: '36px', fontWeight: '700' }],
        'title-large': ['24px', { lineHeight: '28px', fontWeight: '600' }],
        'title-medium': ['20px', { lineHeight: '24px', fontWeight: '600' }],
        'title-small': ['18px', { lineHeight: '24px', fontWeight: '500' }],
        'body-large': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-medium': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-small': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label-large': ['16px', { lineHeight: '20px', fontWeight: '500' }],
        'label-medium': ['14px', { lineHeight: '16px', fontWeight: '500' }],
        'label-small': ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      spacing: {
        'xxs': '4px',
        'xs': '8px',
        'sm': '16px',
        'md': '24px',
        'lg': '32px',
        'xl': '40px',
        'xxl': '48px',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#ff7664", // Brand Primary
          foreground: "#FFFFFF",
          hover: "#e66a5a", // Darker shade
        },
        secondary: {
          DEFAULT: "#1CB0F6", // Duolingo Macaw Blue
          foreground: "#FFFFFF",
          hover: "#1899D6",
        },
        destructive: {
          DEFAULT: "#FF4B4B", // Duolingo Red
          foreground: "#FFFFFF",
          hover: "#D33131",
        },
        muted: {
          DEFAULT: "#1e293b", // Darker muted for dark theme
          foreground: "#94a3b8", // Slate-400
        },
        accent: {
          DEFAULT: "#FFC800", // Duolingo Bee Yellow
          foreground: "#4B4B4B",
          hover: "#E5B400",
        },
        card: {
          DEFAULT: "#1e293b", // Slate-800 for cards in dark mode
          foreground: "#FFFFFF",
        },
        "duolingo-green": "#ff7664", // Replaced with Brand Primary
        "duolingo-feather": "#89E219",
        "duolingo-bee": "#FFC800",
        "duolingo-macaw": "#1CB0F6",
        "duolingo-fox": "#FF9600",
        "duolingo-card": "#1e293b", // Dark card
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "xl-custom": "20px",
        "2xl-custom": "32px",
        "3xl-custom": "48px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(40px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "squish": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.95, 1.05)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s ease-out",
        "accordion-up": "accordion-up 0.3s ease-out",
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "bounce-in": "bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "float": "float 3s ease-in-out infinite",
        "squish": "squish 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      boxShadow: {
        '3d': '0px 4px 0px 0px rgba(0,0,0,0.2)', // Button shadow
        '3d-hover': '0px 2px 0px 0px rgba(0,0,0,0.2)', // Pressed button shadow
        'card': '0px 4px 0px 0px #E5E5E5', // Card shadow
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;