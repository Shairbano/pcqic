/** @type {import('tailwindcss').Config} */
export default
{
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      // Overrides Tailwind's built-in "purple" and "indigo" palettes so
      // every purple-*/indigo-* class used across the app (bg-purple-600,
      // text-purple-400, border-purple-900/40, etc.) is driven by the CSS
      // variables defined in src/index.css :root instead of fixed hex
      // values. This is the "single place" to retheme the whole app's
      // brand/accent color — change the variables there, not here.
      //
      // The rgb(var(--x) / <alpha-value>) form is required (not a plain
      // hex or CSS var) so that Tailwind's opacity modifiers, e.g.
      // `border-purple-900/40`, keep working exactly as before.
      colors: {
        purple: {
          50:  'rgb(var(--pms-accent-purple-50) / <alpha-value>)',
          100: 'rgb(var(--pms-accent-purple-100) / <alpha-value>)',
          200: 'rgb(var(--pms-accent-purple-200) / <alpha-value>)',
          300: 'rgb(var(--pms-accent-purple-300) / <alpha-value>)',
          400: 'rgb(var(--pms-accent-purple-400) / <alpha-value>)',
          500: 'rgb(var(--pms-accent-purple-500) / <alpha-value>)',
          600: 'rgb(var(--pms-accent-purple-600) / <alpha-value>)',
          700: 'rgb(var(--pms-accent-purple-700) / <alpha-value>)',
          800: 'rgb(var(--pms-accent-purple-800) / <alpha-value>)',
          900: 'rgb(var(--pms-accent-purple-900) / <alpha-value>)',
        },
        indigo: {
          400: 'rgb(var(--pms-accent-indigo-400) / <alpha-value>)',
          500: 'rgb(var(--pms-accent-indigo-500) / <alpha-value>)',
          600: 'rgb(var(--pms-accent-indigo-600) / <alpha-value>)',
          700: 'rgb(var(--pms-accent-indigo-700) / <alpha-value>)',
          800: 'rgb(var(--pms-accent-indigo-800) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}
