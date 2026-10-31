// Deutsch
export default {
  weekdays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  weekdaysMonFirst: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],

  nav: { today: 'Heute', month: 'Monat', year: 'Jahr', settings: 'Einstellungen', main: 'Hauptnavigation', back: 'Zurück', forward: 'Weiter', current: 'Heute' },
  head: { balance: 'Saldo', yearOverview: 'Jahresübersicht' },
  common: {
    hours: '{v} h', close: 'Schließen', cancel: 'Abbrechen', save: 'Speichern', edit: 'Bearbeiten',
    note: 'Bemerkung', dayType: 'Tagesart', normal: 'Normal', ist: 'Ist', soll: 'Soll', diff: 'Diff',
    balance: 'Saldo', total: 'Gesamt', istSoll: 'Ist {ist} · Soll {soll}',
  },

  today: {
    notClockedIn: 'Nicht eingestempelt',
    clockedInSince: 'Eingestempelt seit {time}',
    yesterday: '(gestern)',
    onBreakSince: 'Pause seit {time} · {dur} h',
    finishedAt: 'Feierabend um {time}',
    ofTarget: 'von {dur} h Soll',
    clockIn: 'Kommen', clockOut: 'Gehen', pause: 'Pause', resume: 'Weiter', finish: 'Feierabend',
    targetReached: 'Soll erreicht', remaining: 'noch {dur} h', over: '{dur} h drüber',
    latestEnd: 'Spätestens gehen', maxHours: '10 h Höchstarbeitszeit',
    day: 'Heute', target: 'Soll', overtime: 'Überstunden', totalBalance: 'Saldo gesamt',
    week: 'Diese Woche', weekOf: 'von {dur} h',
    entries: 'Zeiten', running: 'läuft', pauseDeduction: 'Pausenabzug',
    noEntries: 'Noch keine Zeiten. Vergessen? Über „Bearbeiten“ nachtragen.',
    notePlaceholder: 'Projekt, Termin, Dienstreise …',
    missingTitle: 'Noch nicht eingestempelt', missingText: 'Heute ist ein Arbeitstag.',
    pauseWarning: 'Pause unter dem gesetzlichen Minimum (ab 6 h 30 min, ab 9 h 45 min).',
  },

  month: {
    carry: 'Übertrag', istSoll: 'Ist / Soll', endBalance: 'Saldo Ende',
    absence: 'Abwesenheit', print: 'Drucken / PDF', noTimes: 'Keine Zeiten',
  },

  year: {
    vacationLeft: 'Resturlaub', days: { one: '{n} Tag', other: '{n} Tage' },
    vacationUsed: '{used} von {total} genommen', planned: '{n} geplant',
    overtime: 'Überstunden', approxDays: '≈ {n} Arbeitstage',
    months: 'Monate', month: 'Monat', noData: 'Keine Daten',
    dayCounts: 'Tage', present: 'Anwesend', vacation: 'Urlaub', sick: 'Krank',
  },

  dayDialog: {
    clockIn: 'Kommt', clockOut: 'Geht', removeBlock: 'Zeitblock entfernen', addBlock: 'Zeitblock',
    pauseMin: 'Pause (min)', auto: 'auto: {n}', clear: 'Tag leeren', confirmClear: 'Alle Einträge dieses Tages löschen?',
  },

  absence: {
    title: 'Abwesenheit eintragen', type: 'Art', remove: 'Eintrag entfernen', from: 'Von', to: 'Bis', apply: 'Eintragen',
    workdays: { one: '{n} Arbeitstag – Wochenenden und Feiertage werden übersprungen.', other: '{n} Arbeitstage – Wochenenden und Feiertage werden übersprungen.' },
  },

  settings: {
    appearance: 'Darstellung', themeSystem: 'System', themeLight: 'Hell', themeDark: 'Dunkel',
    language: 'Sprache', languageSystem: 'System',
    reminders: 'Erinnerungen', notifications: 'Benachrichtigungen', notifyTarget: 'Melden, wenn Soll erreicht',
    remindAt: 'Einstempeln bis', forgotAfter: 'Ausstempeln nach', off: 'aus',
    sendTest: 'Test senden', testBody: 'So sehen deine Erinnerungen aus.',
    notifyBlocked: 'Benachrichtigungen sind im Browser blockiert – bitte in den Website-Einstellungen erlauben.',
    notifyHint: 'Erinnert, wenn du an einem Arbeitstag bis zur Uhrzeit nicht eingestempelt hast oder nach so vielen Stunden noch eingestempelt bist. Funktioniert, solange die App geöffnet ist.',
    storage: 'Speicherort',
    syncUnsupported: 'Dieser Browser kann nicht automatisch in eine Datei speichern (geht in Chrome oder Edge am Computer). Nutze „Backup sichern“ und wähle dort iCloud Drive.',
    syncIntro: 'Speichert jede Änderung automatisch in eine Datei, z. B. in iCloud Drive.',
    syncNew: 'Neue Datei', syncOpen: 'Vorhandene verbinden', syncAllow: 'Erlauben', syncDisconnect: 'Trennen',
    syncSavedAt: 'Zuletzt gespeichert {time} Uhr', syncConnected: 'Verbunden', syncNeedsPermission: 'Zugriff muss neu erlaubt werden',
    backupSave: 'Backup sichern', backupLoad: 'Backup laden', exportCsv: 'Als CSV für Excel exportieren',
    privacy: 'Die Daten liegen im Browser auf diesem Gerät. Es gibt keinen Server, nichts wird hochgeladen.',
    person: 'Person', name: 'Name', pnr: 'Personal-Nr.', state: 'Bundesland für Feiertage', halfDays: 'Heiligabend & Silvester als halbe Tage',
    schedule: 'Soll-Arbeitszeit', scheduleUnit: 'Stunden pro Tag', addPeriod: 'Zeitraum', from: 'ab', deletePeriod: 'Zeitraum löschen',
    perWeek: '{dur} h pro Woche', scheduleHint: 'Eingabe als 7:30 oder 7,5. Gilt ab dem Datum bis zum nächsten Zeitraum.',
    needOnePeriod: 'Mindestens ein Zeitraum wird benötigt.', confirmDeletePeriod: 'Zeitraum löschen?',
    pause: 'Pause', pauseFixed: 'Fester Abzug', pauseLegal: 'Nach Gesetz', pausePerDay: 'Minuten pro Tag',
    pauseFixedHint: 'Gestempelte Pausen werden angerechnet. Pro Tag änderbar.',
    pauseLegalHint: 'Ab 6 h 30 min, ab 9 h 45 min, gestempelte Pausen zählen mit. Pro Tag änderbar.',
    accounts: 'Konten', vacationDays: 'Urlaubstage {year}', vacationCarry: 'Resturlaub aus {year}', hourCarry: 'Stunden-Übertrag beim Start (z. B. -2:30)',
    reset: 'Zurücksetzen', resetButton: 'Alle Daten löschen', resetHint: 'Löscht alles, was in der App erfasst ist. Vorher ein Backup sichern.',
    confirmReset: 'Wirklich ALLE erfassten Daten löschen? Das lässt sich nicht rückgängig machen.',
  },

  sync: {
    loadFrom: 'Daten aus „{file}“ laden? (Stand {when})\n\nAbbrechen = aktuelle Daten in die Datei schreiben.',
    unknown: 'unbekannt', connectFailed: 'Datei konnte nicht verbunden werden: {error}', fileType: 'Clockwise-Daten',
  },
  backup: {
    invalid: 'Keine Clockwise-Datei', confirmReplace: 'Aktuelle Daten durch das Backup ersetzen?',
    importFailed: 'Import fehlgeschlagen: {error}', saveFailed: 'Speichern fehlgeschlagen: {error}',
  },

  notify: {
    missingTitle: 'Noch nicht eingestempelt', missingBody: 'Heute ist ein Arbeitstag – Kommen nicht vergessen.',
    targetTitle: 'Soll erreicht', targetBody: 'Du hast heute {dur} h gearbeitet.',
    forgotTitle: 'Noch eingestempelt?', forgotBody: 'Seit {time} eingestempelt – ausstempeln vergessen?',
  },

  print: {
    title: 'Arbeitszeitnachweis {month} {year}', pnr: 'Personal-Nr. {pnr}',
    day: 'Tag', clockIn: 'Kommt', clockOut: 'Geht', pause: 'Pause',
    carryPrev: 'Übertrag Vormonat', target: 'Soll-Arbeitszeit', actual: 'Ist-Arbeitszeit', carryNext: 'Übertrag nächster Monat',
    absences: 'Urlaub / Krank / Homeoffice', absenceDays: '{vac} / {sick} / {ho} Tage',
    signEmployee: 'Datum, Arbeitnehmer', signEmployer: 'Datum, Arbeitgeber',
  },

  csv: {
    file: 'Arbeitszeit-{year}.csv',
    columns: ['Datum', 'Tag', 'Feiertag', 'Kommt1', 'Geht1', 'Kommt2', 'Geht2', 'Weitere', 'Pause', 'Code', 'IST', 'SOLL', 'Diff', 'Saldo', 'Bemerkung'],
  },

  codes: {
    U: 'Urlaub', UH: 'Urlaub ½ Tag', K: 'Krank', KR: 'Krank Restzeit', G: 'Gleittag', H: 'Homeoffice',
    D: 'Dienstreise', B: 'Bereitschaft', KU: 'Kurzarbeit', KA: 'Kurzarbeit Restzeit',
  },

  holidays: {
    newYear: 'Neujahr', epiphany: 'Heilige Drei Könige', womensDay: 'Int. Frauentag', goodFriday: 'Karfreitag',
    easterSunday: 'Ostersonntag', easterMonday: 'Ostermontag', labourDay: 'Maifeiertag', ascension: 'Christi Himmelfahrt',
    whitSunday: 'Pfingstsonntag', whitMonday: 'Pfingstmontag', corpusChristi: 'Fronleichnam', assumption: 'Mariä Himmelfahrt',
    childrensDay: 'Weltkindertag', unity: 'Tag der Deutschen Einheit', reformation: 'Reformationstag', allSaints: 'Allerheiligen',
    repentance: 'Buß- und Bettag', christmasEve: 'Heiligabend', christmas1: '1. Weihnachtsfeiertag', christmas2: '2. Weihnachtsfeiertag',
    newYearsEve: 'Silvester',
  },

  states: {
    BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg',
    HE: 'Hessen', MV: 'Mecklenburg-Vorpommern', NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen',
    RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen',
  },
};
