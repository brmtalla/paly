/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sampled from the Paly logo rather than a stock Tailwind indigo, so the
        // site and the app icon read as the same brand.
        paly: {
          50: '#EEF3FC',
          100: '#D8E4F8',
          200: '#B3C9F1',
          300: '#85A7E7',
          400: '#5583DA',
          500: '#3062C6',
          600: '#2050B0',
          700: '#1B4090',
          800: '#173571',
          900: '#142B57',
          950: '#0C1A38',
        },
        // The two accent marks in the logo: the teal swoosh and the amber spark.
        teal: {
          300: '#7FE6DA',
          400: '#4FD8C8',
          500: '#2BC4B4',
          600: '#1FA89A',
        },
        amber: {
          300: '#FADF9E',
          400: '#F7D06E',
          500: '#F5C24C',
          600: '#E0A92E',
        },
        surface: {
          primary: '#FBFAF8',
          secondary: '#F4F2EE',
          tertiary: '#EAE6E0',
        },
        imessage: '#248BF5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        // Entrances decelerate: fast out of the gate, settling gently.
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        // A touch of overshoot for elements that should feel physical.
        spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
      },
      boxShadow: {
        phone: '0 50px 100px -20px rgba(12, 26, 56, 0.45), 0 30px 60px -30px rgba(12, 26, 56, 0.6)',
        lift: '0 10px 30px -10px rgba(32, 80, 176, 0.35)',
      },
    },
  },
  plugins: [],
};
