/** @type {import('tailwindcss').Config} */
module.exports = {
  // Only enable dark styling via an explicit `.dark` class, never via the OS
  // `prefers-color-scheme`. The app is a light-canvas design; leaving this as
  // the v3 default ("media") would activate every `dark:` utility on machines
  // set to dark mode and break contrast.
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        hairline: 'var(--hairline)',
        'hairline-soft': 'var(--hairline-soft)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        canvas: 'var(--canvas)',
        'surface-soft': 'var(--surface-soft)',
        'surface-card': 'var(--surface-card)',
        'surface-strong': 'var(--surface-strong)',
        'surface-dark': 'var(--surface-dark)',
        'surface-dark-elevated': 'var(--surface-dark-elevated)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          active: 'var(--primary-active)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        'brand-accent': 'var(--brand-accent)',
        'badge-orange': 'var(--badge-orange)',
        'badge-pink': 'var(--badge-pink)',
        'badge-violet': 'var(--badge-violet)',
        'badge-emerald': 'var(--badge-emerald)',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.05)',
        elevated: '0 4px 12px rgba(0,0,0,0.08)',
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
}
