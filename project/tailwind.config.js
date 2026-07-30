/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'sans-serif'],
      },
      colors: {
        forest: {
          50: '#f0f7f0',
          100: '#dcecdf',
          200: '#bbd8c2',
          300: '#8fbd9d',
          400: '#5e9b71',
          500: '#3d7d52',
          600: '#2c6440',
          700: '#234f33',
          800: '#1d3f2a',
          900: '#15291c',
          950: '#0c1a11',
        },
        gold: {
          50: '#fbf8ef',
          100: '#f5edd0',
          200: '#ead8a0',
          300: '#ddbd6b',
          400: '#d4a345',
          500: '#c4882e',
          600: '#a86b25',
          700: '#864f21',
          800: '#6e3f21',
          900: '#5d341e',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.7s ease-out',
        'fade-in-down': 'fadeInDown 0.7s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow': 'spin 20s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        fadeInUp: { '0%': { opacity: 0, transform: 'translateY(30px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeInDown: { '0%': { opacity: 0, transform: 'translateY(-30px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: 0, transform: 'translateX(30px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
};
