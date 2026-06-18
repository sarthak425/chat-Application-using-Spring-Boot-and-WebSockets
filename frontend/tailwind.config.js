export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wa: {
          bg: '#111b21',
          panel: '#202c33',
          surface: '#0b141a',
          accent: '#25d366',
          accentDark: '#128c7e'
        }
      },
      boxShadow: {
        soft: '0 20px 60px rgba(0, 0, 0, 0.35)'
      },
      fontFamily: {
        body: ['Poppins', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif']
      }
    }
  },
  plugins: []
};
