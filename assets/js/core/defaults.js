// Startzustand für neue Installationen. Eigene Daten kommen per "Backup laden".

export const DEFAULT_STATE = {
  version: 1,
  settings: {
    name: '',
    pnr: '',
    land: 'NW',
    halfHolidays: true,
    pauseMode: 'fix',
    pauseMin: 45,
    // Soll-Minuten je Wochentag (Mo–So), gültig ab Datum
    periods: [{ from: '2026-01-01', min: [420, 420, 420, 420, 420, 0, 0] }],
    vacation: {},
    vacationCarry: {},
    carry: 0,
    theme: 'system',
    remind: { on: false, at: '09:00', soll: true, forgot: 10 },
  },
  days: {},
};
