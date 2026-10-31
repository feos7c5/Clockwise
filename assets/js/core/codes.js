export const CODES = {
  U: { f: 0 },
  UH: { f: 0.5 },
  K: { f: 0 },
  KR: { f: 'NONE' },
  G: { f: 1 },
  H: { f: 1 },
  D: { f: 1 },
  B: { f: 'XTRA' },
  KU: { f: 0 },
  KA: { f: 'NONE' },
};

export const QUICK_CODES = ['H', 'D', 'U', 'UH', 'K', 'G'];

export const ABSENCE_CODES = ['U', 'UH', 'K', 'G', 'H', 'D', 'KU'];

export const vacationValue = code => (code === 'U' ? 1 : code === 'UH' ? 0.5 : 0);
