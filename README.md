<p align="center">
  <img src="assets/icons/logo.svg" width="96" height="96" alt="Clockwise Logo">
</p>

<h1 align="center">Clockwise</h1>

<p align="center">
  Arbeitszeit erfassen für Vertrauensarbeitszeit – Kommen, Gehen, Überstunden-Saldo.<br>
  Als Web-App installierbar, offline nutzbar, alle Daten bleiben auf dem Gerät.
</p>

<p align="center">
  <a href="https://feos7c5.github.io/Clockwise/"><b>App öffnen →</b></a>
</p>

<p align="center">
  <img src="docs/screenshots.png" alt="Ansichten Heute, Monat und Jahr" width="820">
</p>

## Funktionen

- **Stempeln** mit Kommen, Pause und Gehen, Live-Timer, Prognose „Soll erreicht um“ und 10-h-Grenze
- **Überstunden-Saldo** über alle Monate, mit Übertrag wie in der klassischen Excel-Zeiterfassung
- **Tagesarten**: Homeoffice, Dienstreise, Urlaub (ganz/halb), Krank, Gleittag, Kurzarbeit
- **Feiertage** für alle 16 Bundesländer, Heiligabend und Silvester optional als halbe Tage
- **Pausenregel** fest oder nach § 4 ArbZG, gestempelte Pausen werden angerechnet
- **Soll-Zeiten** je Wochentag mit „gilt ab“-Zeiträumen (z. B. bei Stundenänderung)
- **Abwesenheiten** für Zeiträume eintragen, Wochenenden und Feiertage werden übersprungen
- **Monatsnachweis** als PDF mit Unterschriftszeilen, **CSV-Export** für Excel
- **Sync zwischen Geräten** per Kopplungscode – Ende-zu-Ende-verschlüsselt, ohne Konto
- **Erinnerungen**, wenn an einem Arbeitstag noch nicht eingestempelt ist
- **Hell/Dunkel** nach Systemeinstellung
- **Sprachen**: Deutsch und Englisch, folgt der Systemsprache oder fest einstellbar

## Installation auf dem iPhone

1. [feos7c5.github.io/Clockwise](https://feos7c5.github.io/Clockwise/) in **Safari** öffnen
2. **Teilen → Zum Home-Bildschirm**
3. Optional: vorhandene Daten über *Einstellungen → Backup laden* einspielen

Am Mac funktioniert dasselbe in Safari (*Ablage → Zum Dock hinzufügen*) oder Chrome (*Installieren*).

## Datenschutz

Es gibt keinen Server und kein Tracking. Alle Daten liegen im Browser-Speicher des Geräts.
Zur Sicherung dienen *Backup sichern* (JSON-Datei, z. B. nach iCloud Drive) und in Chrome/Edge
die automatische Speicherung in eine Datei.

## Sync

Optional und ohne Konto: Auf dem ersten Gerät *Einstellungen → Sync einschalten*, auf jedem weiteren
*Mit Gerät verbinden* und den angezeigten Code eingeben (wie beim Koppeln eines Fernsehers).

- **Ende-zu-Ende-verschlüsselt:** Aus einem zufälligen Geheimnis (nur auf den Geräten) werden per HKDF ein
  Zugriffs-Token und ein AES-GCM-Schlüssel abgeleitet. Der Server sieht nur verschlüsselte Daten.
- **Kopplungscode:** 8 Zeichen, 10 Minuten gültig, einmal einlösbar. Er verschlüsselt das Geheimnis für die
  Übergabe (PBKDF2, 600 000 Runden) – auch der Server kann ihn nicht durchprobieren.
- **Konfliktfrei:** Jeder Tag trägt einen Änderungszeitstempel, die neuere Änderung gewinnt, Löschungen
  werden übertragen. Darstellung, Sprache und Erinnerungen bleiben pro Gerät.
- **Wiederherstellungsschlüssel:** für den Fall, dass alle Geräte verloren gehen.

Der Server ist ein Cloudflare Worker mit D1-Datenbank in [`server/`](server/) (rund 130 Zeilen).

```sh
cd server && npm install
npm run migrate:local && npm run dev   # lokal auf http://localhost:8787
npm test                                # API-Tests gegen den laufenden Server
```

## Entwicklung

Reines HTML, CSS und JavaScript (ES-Module) – kein Build-Schritt, keine Abhängigkeiten.

```sh
npm start   # lokaler Server auf http://localhost:8765
npm test    # Tests der Rechenlogik (Node ≥ 20)
```

```
├── index.html               App-Gerüst
├── manifest.webmanifest     PWA-Manifest
├── sw.js                    Service Worker (offline, Erinnerungen)
├── assets/
│   ├── css/                 tokens · base · components · layout · views · print
│   ├── icons/               Logo und App-Icons
│   └── js/
│       ├── main.js          Einstiegspunkt
│       ├── core/            Rechnung, Feiertage, Speicher, Sync – ohne DOM
│       ├── i18n/            Übersetzungen (de, en) und Intl-Formatierung
│       ├── sync/            Verschlüsselung, Zusammenführen, Sync-Ablauf
│       ├── ui/              DOM-Helfer, Icons, Dialog, Navigation, Theme
│       ├── views/           Heute, Monat, Jahr, Einstellungen, Dialoge
│       └── features/        Export, Druck, Erinnerungen
├── server/                  Sync-Server (Cloudflare Worker + D1)
├── tests/                   node:test
├── tools/                   Dev-Server, Excel-Import
└── docs/                    Screenshots
```

### Design-System

Alle Größen sind Tokens in `rem` (`assets/css/tokens.css`): Typo-Skala, 4er-Abstandsraster,
Radien, Control-Höhen und Farben für hell/dunkel. Über `--scale` lässt sich die gesamte
Oberfläche proportional vergrößern oder verkleinern.

### Übersetzungen

Alle Texte liegen in `assets/js/i18n/<sprache>.js`. Neue Sprache: Datei mit denselben Schlüsseln
anlegen und in `assets/js/i18n/index.js` unter `LANGUAGES` eintragen. Datums- und Zahlenformate
kommen automatisch aus `Intl`.

### Excel-Import

Bestehende Zeiterfassungen aus der Excel-Vorlage (Monatsblätter Januar–Dezember) lassen sich
in eine Backup-Datei umwandeln und in der App laden:

```sh
pip install openpyxl
python3 tools/excel_import.py Arbeitszeit.xlsx Import.json
```

### Commits

[Conventional Commits](https://www.conventionalcommits.org/de/) – `feat:`, `fix:`, `docs:`,
`refactor:`, `chore:` usw. Der Hook in `.githooks/` prüft das Format:

```sh
git config core.hooksPath .githooks
```
