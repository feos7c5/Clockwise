// Tagesarten. f = Faktor auf die Soll-Zeit, 'NONE'/'XTRA' = Soll entspricht Ist.

export const CODES = {
  U:  { label: 'Urlaub', f: 0 },
  UH: { label: 'Urlaub ½ Tag', f: 0.5 },
  K:  { label: 'Krank', f: 0 },
  KR: { label: 'Krank Restzeit', f: 'NONE' },
  G:  { label: 'Gleittag', f: 1 },
  H:  { label: 'Homeoffice', f: 1 },
  D:  { label: 'Dienstreise', f: 1 },
  B:  { label: 'Bereitschaft', f: 'XTRA' },
  KU: { label: 'Kurzarbeit', f: 0 },
  KA: { label: 'Kurzarbeit Restzeit', f: 'NONE' },
};

// Schnellauswahl auf der Heute-Seite
export const QUICK_CODES = ['H', 'D', 'U', 'UH', 'K', 'G'];

// Auswahl im Abwesenheits-Dialog
export const ABSENCE_CODES = ['U', 'UH', 'K', 'G', 'H', 'D', 'KU'];

export const vacationValue = code => (code === 'U' ? 1 : code === 'UH' ? 0.5 : 0);
