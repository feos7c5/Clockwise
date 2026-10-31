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
- **Few requests:** uploads go straight to the server with the last known version (a conflict returns the
  newer state to merge). Polling happens on open and every 2 minutes while visible; unchanged data answers 304.

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
`refactor:`, `chore:` and so on. The hook in `.githooks/` checks the format:

```sh
git config core.hooksPath .githooks
```
