const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), surface2: v('surface2'), ink: v('ink'), muted: v('muted'), line: v('line'),
        accent: v('accent'), 'accent-soft': v('accent-soft'), 'accent-strong': v('accent-strong'), 'on-accent': v('on-accent'),
        danger: v('danger'), 'danger-soft': v('danger-soft'), warn: v('warn'), 'warn-soft': v('warn-soft'), ok: v('ok'), 'ok-soft': v('ok-soft'),
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
    },
  },
  plugins: [],
};
