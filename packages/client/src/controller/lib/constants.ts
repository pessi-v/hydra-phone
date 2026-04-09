import type { FunctionType } from '../types';

export const CATEGORY_COLORS: Record<FunctionType, string> = {
  src:          '#FF8C00',
  coord:        '#4CAF50',
  color:        '#E91E63',
  combine:      '#2196F3',
  combineCoord: '#9C27B0',
};

export const CATEGORY_LABELS: Record<FunctionType, string> = {
  src:          'Source',
  coord:        'Geometry',
  color:        'Color',
  combine:      'Blend',
  combineCoord: 'Modulate',
};

export const CONTROLS_BG = '#37474F';
export const PAGE_BG = '#1A1A2E';
export const TEXT_PRIMARY = '#FFFFFF';
export const TEXT_SECONDARY = '#B0BEC5';
export const SLIDER_TRACK = '#455A64';

// Number of transform slots (columns 2–7)
export const TRANSFORM_SLOTS = 6;

// Default output buffers
export const OUTPUT_BUFFERS = ['o0', 'o1', 'o2', 'o3'] as const;
