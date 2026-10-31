// Tagesarten. f = Faktor auf die Soll-Zeit, 'NONE'/'XTRA' = Soll entspricht Ist.
// Bezeichnungen stehen in den Sprachdateien unter codes.<Kürzel>.

export const CODES = {
  U: { f: 0 },          // Urlaub
  UH: { f: 0.5 },       // Urlaub ½ Tag
  K: { f: 0 },          // Krank
  KR: { f: 'NONE' },    // Krank Restzeit
  G: { f: 1 },          // Gleittag
  H: { f: 1 },          // Homeoffice
  D: { f: 1 },          // Dienstreise
  B: { f: 'XTRA' },     // Bereitschaft
  KU: { f: 0 },         // Kurzarbeit
  KA: { f: 'NONE' },    // Kurzarbeit Restzeit
};

// Schnellauswahl auf der Heute-Seite
export const QUICK_CODES = ['H', 'D', 'U', 'UH', 'K', 'G'];

// Auswahl im Abwesenheits-Dialog
export const ABSENCE_CODES = ['U', 'UH', 'K', 'G', 'H', 'D', 'KU'];

export const vacationValue = code => (code === 'U' ? 1 : code === 'UH' ? 0.5 : 0);
