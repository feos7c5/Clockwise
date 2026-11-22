# Development

Plain HTML, CSS and JavaScript (ES modules) – no build step, no dependencies.

```sh
npm start   # local server on http://localhost:8765
npm test    # unit tests (Node ≥ 20)
```

## Structure

```
├── index.html               app shell
├── manifest.webmanifest     PWA manifest
├── sw.js                    service worker (offline, notifications)
├── assets/
│   ├── css/                 tokens · base · components · layout · views
│   ├── icons/               logo and app icons
│   └── js/
│       ├── main.js          entry point
│       ├── core/            calculation, holidays, storage – no DOM
│       ├── i18n/            translations (de, en) and Intl formatting
│       ├── sync/            encryption, merging, sync flow
│       ├── ui/              DOM helpers, icons, dialog, navigation, theme
│       ├── views/           today, month, year, settings, dialogs
│       └── features/        export, PDF report, reminders, install hint, updates
├── server/                  sync server (Cloudflare Worker + D1)
├── tests/                   node:test
├── tools/                   dev server, Excel import
└── docs/                    screenshots, this file
```

## Sync

Optional and account-free. On the first device: *Settings → Turn on sync*. On every other device:
*Connect to a device* and enter the code shown on the first one.

- **End-to-end encrypted:** A random secret that only lives on the devices is turned into an access
  token and an AES-GCM key via HKDF. The server only ever sees encrypted data.
- **Pairing code:** 8 characters, valid for 10 minutes, single use. It encrypts the secret for the
  handover (PBKDF2, 600,000 iterations), so not even the server can brute-force it.
- **Conflict-free:** Every day carries a change timestamp, the newer change wins, deletions propagate.
  Theme, language and reminders stay per device.
- **Recovery key:** for when all devices are lost.
- **Offline first:** everything works without a connection. Changes are buffered for 3 seconds, sent in one
  upload and remembered as pending until the server confirms them – also across restarts.
- **Live updates:** open apps keep a WebSocket to a Durable Object per vault. After an upload the server
  broadcasts only the new version number; listening devices then pull the encrypted data.
- **Few requests:** uploads go straight to the server with the last known version (a conflict returns the
  newer state to merge). Polling happens on open and every 2 minutes while visible; unchanged data answers 304.

## Categories

Optional and invisible until the user creates a class in the settings (`core/tags.js`). A class (e.g. "Project",
"Activity") has tags; a block carries at most one tag per class (`block.t = { classId: tagId }`), so every class
adds up to the whole worked time. While clocked in, choosing another tag ends the running block and continues
with a new one, without a gap. `tagTotals` in `core/calc.js` spreads the break of a day over its blocks by their
length. Classes and tags are never deleted, only archived, and are merged one by one across devices (`state.tags`,
only part of the synced data once in use). The "Analysis" tab shows the distribution and is also where classes
and tags are managed; without a class it explains the feature. Month and year share the "Overview" tab and one
month/year switch with it.

## Notifications

Reminders and the automatic clock-out reach the device even when the app is closed (on iPhone once it is
added to the Home Screen). Each device shares its push address, reminder settings and language through the
encrypted sync. Whenever the data changes on any device, that device sends the upcoming notifications of all
devices – clock-in reminder for the next 7 workdays, target reached, automatic clock-out – to the server, so
clocking out on one device cancels the reminders on the others. Each list replaces the previous one, and a
notification that was already delivered is never sent twice. A cron trigger checks every minute and delivers
due ones via Web Push (VAPID, encrypted payload); a second, daily one cleans up. Only the push services of
Apple, Google, Mozilla and Microsoft are accepted as targets.

The clock-out itself is written into the data once the device has synced, at the moment the limit was reached.
It counts as only just newer than the clock-in, so a real clock-out made on another device always wins.

One-time setup for the server:

```sh
cd server
npm run vapid                              # prints a key pair
# public key → VAPID_PUBLIC_KEY in wrangler.toml and VAPID_KEY in assets/js/sync/config.js, private key:
npx wrangler secret put VAPID_PRIVATE_KEY
npm run migrate:remote && npm run deploy
```

## Updates

The service worker activates new versions immediately and the open app reloads itself (deferred while a
dialog or input is in use). App files are served from the cache of the installed version, so the app starts
instantly, also offline.

`tools/build-meta.mjs` generates the list of offline files in `sw.js`, the cache name (a hash of all app files)
and, in `index.html`, an import map that gives every module a per-version address (`store.js?v=1.117`), the
same for the style sheets, plus module preloads. Because all addresses change with each version, a page can
never run with scripts or styles of another version: after an update Safari otherwise reused copies it still
had in memory and showed the new page with the old code. The import map is inline, so its hash is written into
the content security policy. The `pre-commit` hook runs it and, when the app changed, also sets
the version in `assets/js/version.js` (shown at the bottom of the settings). CI runs it with `--check`, so a
commit made without the hook fails visibly instead of never reaching installed apps.

The server is a Cloudflare Worker with a D1 database in [`server/`](../server/) (about 130 lines).

```sh
cd server && npm install
npm run migrate:local && npm run dev   # local on http://localhost:8787
npm test                                # API tests against the running server
```

## Design system

All sizes are `rem` tokens in `assets/css/tokens.css`: type scale, 4px spacing grid, radii,
control heights and light/dark colors. `--scale` resizes the whole interface proportionally.

## Translations

All texts live in `assets/js/i18n/<language>.js`. To add a language, create a file with the same
keys and register it in `LANGUAGES` in `assets/js/i18n/index.js`. Date and number formats come
from `Intl`.

## Excel import

Existing records from the Excel template (monthly sheets January–December) can be converted into a
backup file and loaded in the app:

```sh
pip install openpyxl
python3 tools/excel_import.py Arbeitszeit.xlsx Import.json
```

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) – `feat:`, `fix:`, `docs:`,
`refactor:`, `chore:` and so on. The hooks in `.githooks/` check the format and update the generated files;
`npm install` turns them on:

```sh
npm install        # sets git config core.hooksPath .githooks
```

CI (`.github/workflows/ci.yml`) runs the app tests, the generated-files check and the server tests against a
local worker on every push.
