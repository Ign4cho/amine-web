export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F9F4EA',
        header: '#2D2A29',
        mustard: '#F0C14B',
        text: { primary: '#2D2A29', light: '#5C5753' }
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', 'sans-serif'],
        opensans: ['"Open Sans"', 'sans-serif'],
        georgia: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
