import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './ctrl.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        src:          '#FF8C00',
        coord:        '#4CAF50',
        color:        '#E91E63',
        combine:      '#2196F3',
        combineCoord: '#9C27B0',
        controls:     '#37474F',
        bg:           '#1A1A2E',
      },
    },
  },
  plugins: [],
} satisfies Config;
