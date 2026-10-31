export default {
  weekdays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  weekdaysMonFirst: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],

  nav: { today: 'Today', month: 'Month', year: 'Year', settings: 'Settings', main: 'Main navigation', back: 'Back', forward: 'Forward', current: 'Today' },
  head: { balance: 'Balance', yearOverview: 'Year overview' },
  common: {
    dismiss: 'Dismiss', hours: '{v} h', close: 'Close', cancel: 'Cancel', save: 'Save', edit: 'Edit',
    note: 'Note', dayType: 'Day type', normal: 'Regular', ist: 'Actual', soll: 'Target', diff: 'Diff',
    balance: 'Balance', total: 'Total', istSoll: 'Actual {ist} · Target {soll}',
  },

  today: {
    notClockedIn: 'Not clocked in',
    clockedInSince: 'Clocked in since {time}',
    yesterday: '(yesterday)',
    onBreakSince: 'On break since {time} · {dur} h',
    finishedAt: 'Finished at {time}',
    ofTarget: 'of {dur} h target',
    clockIn: 'Clock in', clockOut: 'Clock out', pause: 'Break', resume: 'Resume', finish: 'Done for today',
    targetReached: 'Target reached', remaining: '{dur} h to go', over: '{dur} h over',
    latestEnd: 'Leave by', maxHours: '10 h legal maximum',
    day: 'Today', target: 'Target', overtime: 'Overtime', totalBalance: 'Total balance',
    week: 'This week', weekOf: 'of {dur} h',
    entries: 'Times', running: 'running', pauseDeduction: 'Break deduction',
    noEntries: 'No times yet. Forgot? Add them via “Edit”.',
    notePlaceholder: 'Project, appointment, business trip …',
    missingTitle: 'Not clocked in yet', missingText: 'Today is a working day.',
    pauseWarning: 'Break below the legal minimum (30 min after 6 h, 45 min after 9 h).',
  },

  month: {
    carry: 'Carried over', istSoll: 'Actual / Target', endBalance: 'Closing balance',
    absence: 'Absence', print: 'Print / PDF', noTimes: 'No times',
  },

  year: {
    vacationLeft: 'Vacation left', days: { one: '{n} day', other: '{n} days' },
    vacationUsed: '{used} of {total} taken', planned: '{n} planned', prorated: 'prorated', carryIncluded: 'incl. {n} from {year}',
    overtime: 'Overtime', approxDays: '≈ {n} working days',
    months: 'Months', month: 'Month', noData: 'No data',
    dayCounts: 'Days', present: 'Present', vacation: 'Vacation', sick: 'Sick',
  },

  dayDialog: {
    clockIn: 'In', clockOut: 'Out', removeBlock: 'Remove time block', addBlock: 'Time block',
    pauseMin: 'Break (min)', auto: 'auto: {n}', clear: 'Clear day', confirmClear: 'Delete all entries for this day?',
  },

  absence: {
    title: 'Add absence', type: 'Type', remove: 'Remove entry', from: 'From', to: 'To', apply: 'Apply',
    workdays: { one: '{n} working day – weekends and holidays are skipped.', other: '{n} working days – weekends and holidays are skipped.' },
  },

  settings: {
    appearance: 'Appearance', themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
    language: 'Language', languageSystem: 'System',
    reminders: 'Reminders', notifications: 'Notifications', notifyTarget: 'Notify when target is reached',
    remindAt: 'Clock in by', forgotAfter: 'Clock out after', off: 'off',
    sendTest: 'Send test', testBody: 'This is how your reminders look.',
    notifyBlocked: 'Notifications are blocked in the browser – please allow them in the site settings.',
    notifyHint: 'Reminds you if you haven’t clocked in by that time on a working day, or are still clocked in after that many hours. Works while the app is open.',
    storage: 'Backup & export',
    syncUnsupported: 'This browser cannot save to a file automatically (works in Chrome or Edge on desktop). Use “Save backup” and choose iCloud Drive.',
    syncIntro: 'Saves every change to a file automatically, e.g. in iCloud Drive.',
    syncNew: 'New file', syncOpen: 'Connect existing', syncAllow: 'Allow', syncDisconnect: 'Disconnect',
    syncSavedAt: 'Last saved at {time}', syncConnected: 'Connected', syncNeedsPermission: 'Access needs to be granted again',
    backupSave: 'Save backup', backupLoad: 'Load backup', exportCsv: 'Export CSV for Excel',
    privacy: 'Your data stays in the browser on this device. There is no server, nothing is uploaded.',
    person: 'Person', name: 'Name', pnr: 'Employee no.', state: 'State for public holidays', halfDays: 'Christmas Eve & New Year’s Eve as half days',
    schedule: 'Target hours', scheduleUnit: 'hours per day', addPeriod: 'Period', from: 'from', deletePeriod: 'Delete period',
    perWeek: '{dur} h per week', scheduleHint: 'Enter as 7:30 or 7.5. Applies from the date until the next period.',
    needOnePeriod: 'At least one period is required.', confirmDeletePeriod: 'Delete period?',
    pause: 'Break', pauseFixed: 'Fixed deduction', pauseLegal: 'By law', pausePerDay: 'Minutes per day',
    pauseFixedHint: 'Clocked breaks count towards it. Can be changed per day.',
    pauseLegalHint: '30 min after 6 h, 45 min after 9 h, clocked breaks count. Can be changed per day.',
    accounts: 'Balances', vacationDays: 'Vacation days per year', vacationCarry: 'Carried over from {year}', prorate: 'Prorate in the first year', prorateStart: 'Start date', prorateResult: '{year}: {n} days prorated from {date}',
    carryAuto: 'automatic: {n}',
    hourCarry: 'Starting hour balance (e.g. -2:30)',
    accountsHint: 'Vacation days also apply to the following years. Unused vacation is carried over automatically – only enter it if it differs (e.g. expired). The hour balance simply continues across years.',
    reset: 'Reset', resetButton: 'Delete all data', resetHint: 'Deletes everything recorded in the app – on all devices if sync is on. Save a backup first.',
    confirmReset: 'Really delete ALL recorded data? This cannot be undone.',
  },

  update: { title: 'New version available', text: 'Updating reloads the app – your data is kept.', action: 'Update' },

  install: {
    title: 'Install as app', action: 'Install', dismiss: 'Dismiss',
    ios: 'In Safari, tap ••• → “Share” → “Add to Home Screen”. Clockwise then starts like an app, even offline.',
    mac: 'In Safari: “File” menu → “Add to Dock”.',
    prompt: 'Starts like a standalone app, even offline.',
  },

  cloud: {
    title: 'Sync',
    intro: 'Your times on all your devices automatically – end-to-end encrypted, no account.',
    enable: 'Turn on sync', join: 'Connect to a device',
    statusSyncing: 'Syncing …', statusOk: 'Up to date', statusOkAt: 'Up to date · {time}',
    statusOffline: 'Offline – will catch up', statusError: 'Sync failed',
    addDevice: 'Connect another device', recovery: 'Recovery key', disable: 'Turn off sync',
    pairTitle: 'Connect a device',
    pairHint: 'On the other device: Settings → Sync → “Connect to a device” and enter this code.',
    validFor: 'Valid for {time}', expired: 'Code expired', newCode: 'New code', creating: 'Creating code …',
    copy: 'Copy', copied: 'Copied ✓',
    joinTitle: 'Connect to a device',
    joinHint: 'On the other device, tap “Connect another device” and enter the code here.',
    codeLabel: 'Code', codePlaceholder: 'XXXX-XXXX', paste: 'Paste', connect: 'Connect', connecting: 'Connecting …',
    joinRecoveryHint: 'No device left? Your recovery key works here too.',
    errInvalid: 'That is not a valid code.', errUnknown: 'Unknown or expired code – show a new one on the other device.',
    errNetwork: 'Cannot reach the server. Please try again later.',
    recoveryTitle: 'Recovery key',
    recoveryHint: 'Restores your data if all devices are lost. Keep it safe, e.g. in your password manager – anyone who has it can read your data.',
    saveFile: 'Save as file', recoveryFile: 'Clockwise-Recovery.txt',
    recoveryFileText: 'Clockwise – recovery key\n\n{key}\n\nTo use: Settings → Sync → “Connect to a device” → paste the key.\nKeep it secret!',
    disableTitle: 'Turn off sync', disableHint: 'The data on this device is kept.',
    disableDevice: 'Disconnect this device', disableAll: 'Also delete server copy',
    confirmWipe: 'The encrypted copy on the server will be deleted and other devices will stop syncing. Continue?',
    onboardTitle: 'Already using Clockwise on another device?', onboardText: 'Bring your data here with a code.', onboardAction: 'Connect',
  },

  sync: {
    loadFrom: 'Load data from “{file}”? (saved {when})\n\nCancel = write current data to the file.',
    unknown: 'unknown', connectFailed: 'Could not connect file: {error}', fileType: 'Clockwise data',
  },
  backup: {
    invalid: 'Not a Clockwise file', confirmReplace: 'Replace current data with the backup?',
    importFailed: 'Import failed: {error}', saveFailed: 'Saving failed: {error}',
  },

  notify: {
    missingTitle: 'Not clocked in yet', missingBody: 'Today is a working day – don’t forget to clock in.',
    targetTitle: 'Target reached', targetBody: 'You have worked {dur} h today.',
    forgotTitle: 'Still clocked in?', forgotBody: 'Clocked in since {time} – forgot to clock out?',
  },

  print: {
    file: 'Timesheet-{year}-{month}.pdf', created: 'Created with Clockwise on {date}',
    title: 'Time sheet {month} {year}', pnr: 'Employee no. {pnr}',
    day: 'Day', clockIn: 'In', clockOut: 'Out', pause: 'Break',
    carryPrev: 'Carried over from previous month', target: 'Target hours', actual: 'Actual hours', carryNext: 'Carried over to next month',
    absences: 'Vacation / Sick / Home office', absenceDays: '{vac} / {sick} / {ho} days',
    signEmployee: 'Date, employee', signEmployer: 'Date, employer',
  },

  csv: {
    file: 'Timesheet-{year}.csv',
    columns: ['Date', 'Day', 'Holiday', 'In1', 'Out1', 'In2', 'Out2', 'More', 'Break', 'Code', 'Actual', 'Target', 'Diff', 'Balance', 'Note'],
  },

  codes: {
    U: 'Vacation', UH: 'Vacation ½ day', K: 'Sick', KR: 'Sick (partial)', G: 'Flex day', H: 'Home office',
    D: 'Business trip', B: 'On call', KU: 'Short-time work', KA: 'Short-time (partial)',
  },

  holidays: {
    newYear: 'New Year’s Day', epiphany: 'Epiphany', womensDay: 'Women’s Day', goodFriday: 'Good Friday',
    easterSunday: 'Easter Sunday', easterMonday: 'Easter Monday', labourDay: 'Labour Day', ascension: 'Ascension Day',
    whitSunday: 'Whit Sunday', whitMonday: 'Whit Monday', corpusChristi: 'Corpus Christi', assumption: 'Assumption Day',
    childrensDay: 'Children’s Day', unity: 'German Unity Day', reformation: 'Reformation Day', allSaints: 'All Saints’ Day',
    repentance: 'Day of Repentance', christmasEve: 'Christmas Eve', christmas1: 'Christmas Day', christmas2: 'Boxing Day',
    newYearsEve: 'New Year’s Eve',
  },

  states: {
    BW: 'Baden-Württemberg', BY: 'Bavaria', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg',
    HE: 'Hesse', MV: 'Mecklenburg-Western Pomerania', NI: 'Lower Saxony', NW: 'North Rhine-Westphalia',
    RP: 'Rhineland-Palatinate', SL: 'Saarland', SN: 'Saxony', ST: 'Saxony-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thuringia',
  },
};
