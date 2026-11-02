export default {
  weekdays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  weekdaysMonFirst: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],

  nav: { today: 'Heute', month: 'Monat', year: 'Jahr', settings: 'Einstellungen', main: 'Hauptnavigation', back: 'Zurück', forward: 'Weiter', current: 'Heute' },
  head: { balance: 'Saldo', yearOverview: 'Jahresübersicht' },
  common: {
    dismiss: 'Ausblenden', hours: '{v} h', close: 'Schließen', cancel: 'Abbrechen', save: 'Speichern', edit: 'Bearbeiten',
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
    vacationUsed: '{used} von {total} genommen', planned: '{n} geplant', prorated: 'anteilig', carryIncluded: 'inkl. {n} aus {year}',
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
    accent: 'Farbe', accents: { sage: 'Salbei', ocean: 'Ozean', lavender: 'Lavendel', terracotta: 'Ziegel', graphite: 'Graphit' },
    language: 'Sprache', languageSystem: 'System',
    reminders: 'Erinnerungen', notifications: 'Benachrichtigungen', notifyTarget: 'Melden, wenn Soll erreicht',
    remindAt: 'Einstempeln bis', forgotAfter: 'Automatisch ausstempeln nach', off: 'aus',
    sendTest: 'Test senden', testBody: 'So sehen deine Erinnerungen aus.',
    notifyBlocked: 'Benachrichtigungen sind im Browser blockiert – bitte in den Website-Einstellungen erlauben.',
    notifyHint: 'Erinnert, wenn du an einem Arbeitstag bis zur Uhrzeit nicht eingestempelt hast, und meldet das Soll. Nach so vielen Stunden Arbeitszeit wird automatisch ausgestempelt. Kommt auch bei geschlossener App an – auf dem iPhone, wenn Clockwise zum Home-Bildschirm hinzugefügt ist.',
    storage: 'Backup & Export',
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
    accounts: 'Konten', vacationDays: 'Urlaubstage pro Jahr', vacationCarry: 'Resturlaub aus {year}', prorate: 'Im Eintrittsjahr anteilig', prorateStart: 'Eintritt am', prorateResult: '{year}: {n} Tage anteilig ab {date}',
    carryAuto: 'automatisch: {n}',
    hourCarry: 'Stunden-Übertrag beim Start (z. B. -2:30)',
    accountsHint: 'Urlaubstage gelten auch für die Folgejahre. Resturlaub wird automatisch ins neue Jahr übertragen – nur eintragen, wenn er abweicht (z. B. verfallen). Der Stunden-Saldo läuft über den Jahreswechsel einfach weiter.',
    reset: 'Zurücksetzen', resetButton: 'Alle Daten löschen', resetHint: 'Löscht alles, was in der App erfasst ist – bei aktivem Sync auf allen Geräten. Vorher ein Backup sichern.',
    confirmReset: 'Wirklich ALLE erfassten Daten löschen? Das lässt sich nicht rückgängig machen.',
  },

  update: { title: 'Neue Version verfügbar', text: 'Aktualisieren lädt sie – deine Daten bleiben erhalten.', action: 'Aktualisieren' },

  install: {
    title: 'Als App installieren', action: 'Installieren', dismiss: 'Ausblenden',
    ios: 'In Safari auf ••• tippen → „Teilen“ → „Zum Home-Bildschirm“. Danach startet Clockwise wie eine App, auch offline.',
    mac: 'In Safari: Menü „Ablage“ → „Zum Dock hinzufügen“.',
    prompt: 'Startet wie eine eigene App, auch offline.',
  },

  cloud: {
    fingerprint: 'Kennung {id}', fingerprintHint: 'Alle Geräte im selben Sync zeigen dieselbe Kennung. Steht ein Gerät nicht in der Liste oder hat eine andere Kennung: dort Sync ausschalten und über „Mit Gerät verbinden“ neu koppeln.',
    devices: 'Geräte', thisDevice: 'Dieses Gerät', lastSeen: 'Zuletzt aktiv: {when}',
    rename: 'Umbenennen', renameTitle: 'Gerät umbenennen', deviceName: 'Name', remove: 'Entfernen',
    confirmRemove: '„{name}“ entfernen?\n\nDas Gerät meldet sich beim nächsten Abgleich ab und löscht dabei seine lokalen Daten.',
    removedTitle: 'Dieses Gerät wurde entfernt', removedText: 'Es wurde auf einem anderen Gerät aus dem Sync entfernt. Die lokalen Daten wurden gelöscht.',
    title: 'Sync',
    intro: 'Deine Zeiten automatisch auf allen Geräten – Ende-zu-Ende-verschlüsselt, ohne Konto.',
    enable: 'Sync einschalten', join: 'Mit Gerät verbinden',
    statusSyncing: 'Wird abgeglichen …', statusOk: 'Aktuell', statusOkAt: 'Aktuell · {time}',
    statusOffline: 'Offline – wird nachgeholt', statusError: 'Abgleich fehlgeschlagen',
    addDevice: 'Weiteres Gerät verbinden', recovery: 'Wiederherstellungsschlüssel', disable: 'Sync ausschalten',
    pairTitle: 'Gerät verbinden',
    pairHint: 'Auf dem anderen Gerät: Einstellungen → Sync → „Mit Gerät verbinden“ und diesen Code eingeben.',
    validFor: 'Gültig noch {time}', expired: 'Code abgelaufen', newCode: 'Neuer Code', creating: 'Code wird erstellt …',
    copy: 'Kopieren', copied: 'Kopiert ✓',
    joinTitle: 'Mit Gerät verbinden',
    joinHint: 'Auf dem anderen Gerät „Weiteres Gerät verbinden“ tippen und den Code hier eingeben.',
    codeLabel: 'Code', codePlaceholder: 'XXXX-XXXX', paste: 'Einfügen', connect: 'Verbinden', connecting: 'Verbinde …',
    joinRecoveryHint: 'Kein Gerät mehr da? Hier geht auch der Wiederherstellungsschlüssel.',
    errInvalid: 'Das ist kein gültiger Code.', errUnknown: 'Code unbekannt oder abgelaufen – lass dir einen neuen anzeigen.',
    errNetwork: 'Keine Verbindung zum Server. Bitte später erneut versuchen.',
    recoveryTitle: 'Wiederherstellungsschlüssel',
    recoveryHint: 'Damit holst du deine Daten zurück, falls alle Geräte verloren gehen. Bewahre ihn sicher auf, z. B. im Passwort-Manager – wer ihn hat, kann deine Daten lesen.',
    saveFile: 'Als Datei sichern', recoveryFile: 'Clockwise-Wiederherstellung.txt',
    recoveryFileText: 'Clockwise – Wiederherstellungsschlüssel\n\n{key}\n\nEinlösen: Einstellungen → Sync → „Mit Gerät verbinden“ → Schlüssel einfügen.\nGeheim halten!',
    disableTitle: 'Sync ausschalten', disableHint: 'Die Daten auf diesem Gerät bleiben erhalten.',
    disableDevice: 'Nur dieses Gerät trennen', disableAll: 'Auch Server-Kopie löschen',
    confirmWipe: 'Die verschlüsselte Kopie auf dem Server wird gelöscht und andere Geräte gleichen nicht mehr ab. Fortfahren?',
    onboardTitle: 'Clockwise schon auf einem anderen Gerät?', onboardText: 'Mit einem Code holst du deine Daten hierher.', onboardAction: 'Verbinden',
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
    autoOutTitle: 'Automatisch ausgestempelt', autoOutBody: 'Nach {hours} h Arbeitszeit um {time} ausgestempelt.',
  },

  print: {
    file: 'Arbeitszeitnachweis-{year}-{month}.pdf', created: 'Erstellt mit Clockwise am {date}',
    title: 'Arbeitszeitnachweis {month} {year}', pnr: 'Personal-Nr. {pnr}',
    day: 'Tag', clockIn: 'Kommt', clockOut: 'Geht', pause: 'Pause',
    carryPrev: 'Übertrag Vormonat', target: 'Soll-Arbeitszeit', actual: 'Ist-Arbeitszeit', carryNext: 'Übertrag nächster Monat',
    absences: 'Diesen Monat: Urlaub / Krank / Homeoffice',
    vacation: 'Urlaubskonto {year}', vacationValue: '{total} Anspruch · {used} genommen · {left} übrig', absenceDays: '{vac} / {sick} / {ho} Tage',
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
