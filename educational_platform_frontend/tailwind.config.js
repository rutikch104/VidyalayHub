import tailwindcssAnimate from "tailwindcss-animate";

export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{js,jsx}"],
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
            screens: {
                xs: '480px',
            },
            fontFamily: {
                sans: [
                    '"Inter"',
                    '"Plus Jakarta Sans"',
                    'ui-sans-serif',
                    'system-ui',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'sans-serif',
                ],
                display: [
                    '"Plus Jakarta Sans"',
                    '"Inter"',
                    'ui-sans-serif',
                    'system-ui',
                    'sans-serif',
                ],
            },
            fontSize: {
                '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
            },
            colors: {
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
                    50: "hsl(250 75% 97%)",
                    100: "hsl(250 75% 93%)",
                    200: "hsl(250 75% 85%)",
                    600: "hsl(250 75% 55%)",
                    700: "hsl(250 75% 48%)",
                    800: "hsl(250 75% 40%)",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                sidebar: {
                    DEFAULT: "var(--sidebar)",
                    foreground: "var(--sidebar-foreground)",
                    primary: "hsl(var(--sidebar-primary))",
                    "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
                    accent: "var(--sidebar-accent)",
                    "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
                    border: "var(--sidebar-border)",
                    ring: "hsl(var(--sidebar-ring))",
                },
                /* brand = alias for primary so hover:text-brand-* / text-brand-* all resolve */
                brand: {
                    50:  "hsl(213 94% 97%)",
                    100: "hsl(213 94% 93%)",
                    200: "hsl(213 94% 85%)",
                    300: "hsl(213 94% 75%)",
                    400: "hsl(213 94% 65%)",
                    500: "hsl(var(--primary))",
                    600: "hsl(213 94% 42%)",
                    700: "hsl(213 94% 36%)",
                    800: "hsl(213 94% 28%)",
                    900: "hsl(213 94% 18%)",
                },
            },
            borderWidth: {
                '3': '3px',
            },
            boxShadow: {
                'xs': '0 1px 2px rgba(0,0,0,0.04)',
                soft: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                card: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
                'card-hover': '0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.06)',
                'shadow-card': '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
                'shadow-card-hover': '0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.06)',
                elevated: '0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.06)',
                modal: '0 20px 60px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)',
                overlay: '0 8px 30px rgba(0,0,0,0.12)',
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            spacing: {
                '4.5': '1.125rem',
                '13': '3.25rem',
                '15': '3.75rem',
                '18': '4.5rem',
            },
            transitionDuration: {
                '250': '250ms',
            },
            transitionTimingFunction: {
                'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
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
                "fade-in": {
                    "0%": { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "scale-in": {
                    "0%": { transform: "scale(0.97)", opacity: "0" },
                    "100%": { transform: "scale(1)", opacity: "1" },
                },
                "slide-left-in": {
                    "0%": { transform: "translateX(8px)", opacity: "0" },
                    "100%": { transform: "translateX(0)", opacity: "1" },
                },
                "pulse-ring": {
                    "0%": { transform: "scale(1)", opacity: "0.6" },
                    "100%": { transform: "scale(1.5)", opacity: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-left-in": "slide-left-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                "pulse-ring": "pulse-ring 1.5s ease-out infinite",
            },
        },
    },
    plugins: [tailwindcssAnimate],
};
