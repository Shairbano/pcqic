// src/utils/cardColors.js
//
// Rotating accent-color palette used for group/card chrome across the app
// (bar color, background tint, border tint). This was previously copy-
// pasted identically in three separate files — now there's one array,
// imported everywhere it's needed, so changing a color here updates it
// everywhere at once.
export const CARD_COLORS = [
  { bar: '#7C3AED', bg: '#1e1a3a', border: '#4c3a8a' },
  { bar: '#059669', bg: '#0d2820', border: '#0d5c3a' },
  { bar: '#2563EB', bg: '#0d1f3a', border: '#1a3a7a' },
  { bar: '#EA580C', bg: '#2a1a0d', border: '#7a3a10' },
  { bar: '#DB2777', bg: '#2a0d1e', border: '#7a1a4a' },
  { bar: '#D97706', bg: '#2a200a', border: '#7a5510' },
];
