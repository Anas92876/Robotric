import type { EventColor } from './api';

/**
 * Flat, quiet colours for the event labels (the backend keeps the old names).
 * `soft` fills the block, `bar` is the strong edge and the swatch.
 */
export const EVENT_SWATCH: Record<EventColor, { soft: string; bar: string }> = {
  blue: { soft: '#e1ecf6', bar: '#1f4e79' },
  green: { soft: '#e1f7e6', bar: '#15803d' },
  red: { soft: '#fbe4e1', bar: '#b42318' },
  yellow: { soft: '#fbf0d6', bar: '#8a5a00' },
  purple: { soft: '#ece8f6', bar: '#5b4694' },
  gray: { soft: '#eef1f4', bar: '#5a6576' },
};

/** Private sessions stand out in Lori's navy with the green edge. */
export const SESSION_SWATCH = { soft: '#0f1f33', bar: '#3fd360' };
