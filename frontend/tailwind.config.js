/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /**
         * Brand green scale.
         * 600 (#107C41) is the primary action colour, 500 (#2CA873) the active
         * highlight, and 100 (#DCF1E7) the selected/active background.
         */
        primary: {
          50: '#e8f5ee',
          100: '#dcf1e7',
          200: '#b9e3cf',
          300: '#8ed2b2',
          400: '#55bc90',
          500: '#2ca873',
          600: '#107c41',
          700: '#0d6836',
          800: '#0a522b',
          900: '#073b20',
        },
        /**
         * Coral scale used for destructive/warning actions.
         * 500 (#E47D51) is the base accent.
         */
        danger: {
          50: '#fdf1ec',
          100: '#fadfd3',
          200: '#f5c4af',
          300: '#efa483',
          400: '#e98e67',
          500: '#e47d51',
          600: '#d2653a',
          700: '#b0512d',
          800: '#8c4024',
          900: '#6b321c',
        },
      },
      borderRadius: {
        // Single source of truth for the app's card/control rounding
        card: '10px',
      },
    },
  },
  plugins: [],
};
