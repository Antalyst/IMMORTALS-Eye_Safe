import type { Config } from 'tailwindcss'

export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#00f0ff',
          blue: '#0066ff',
          purple: '#8b5cf6',
          violet: '#a855f7',
        },
        dark: {
          bg: '#0a0e27',
          surface: '#0f172a',
          card: '#1e293b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        tech: ['Orbitron', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'border-glow': 'border-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { 
            opacity: '1',
            filter: 'brightness(1) drop-shadow(0 0 10px rgba(0, 240, 255, 0.5))',
          },
          '50%': { 
            opacity: '0.8',
            filter: 'brightness(1.2) drop-shadow(0 0 20px rgba(0, 240, 255, 0.8))',
          },
        },
        'glow': {
          '0%': {
            'box-shadow': '0 0 5px rgba(0, 240, 255, 0.5), 0 0 10px rgba(0, 240, 255, 0.3)',
          },
          '100%': {
            'box-shadow': '0 0 20px rgba(0, 240, 255, 0.8), 0 0 30px rgba(0, 102, 255, 0.5)',
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'border-glow': {
          '0%, 100%': {
            'border-color': 'rgba(0, 240, 255, 0.3)',
            'box-shadow': '0 0 10px rgba(0, 240, 255, 0.2)',
          },
          '50%': {
            'border-color': 'rgba(0, 240, 255, 0.8)',
            'box-shadow': '0 0 20px rgba(0, 240, 255, 0.6), 0 0 30px rgba(0, 102, 255, 0.4)',
          },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-neon': 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(0, 102, 255, 0.1) 50%, rgba(139, 92, 246, 0.1) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 240, 255, 0.5), 0 0 20px rgba(0, 240, 255, 0.3)',
        'neon-blue': '0 0 10px rgba(0, 102, 255, 0.5), 0 0 20px rgba(0, 102, 255, 0.3)',
        'neon-purple': '0 0 10px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-lg': '0 0 30px rgba(0, 240, 255, 0.4), 0 0 60px rgba(0, 102, 255, 0.2)',
      },
    },
  },
  plugins: [],
} satisfies Config















