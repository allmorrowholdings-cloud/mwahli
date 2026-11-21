import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        rose: '#B72A57', wine: '#6F173A', petal: '#FFF1F5', blush: '#F8D5DE',
        honey: '#F0B64A', 'honey-light': '#FFF0C9', cream: '#FFF9F3', ink: '#27191F',
        cocoa: '#5B3B44', night: '#1B1217', sage: '#58715D'
      },
      borderRadius: { card: '1.25rem', sheet: '1.75rem' },
      boxShadow: { soft: '0 18px 55px rgb(111 23 58 / .08)' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'], serif: ['Liberation Serif', 'Georgia', 'serif'] }
    }
  },
  plugins: []
} satisfies Config;
