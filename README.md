# AFLOAT v1.0.0

**Vessel Operations, Passage Planning & Maintenance Workbench**

AFLOAT is a local-first, offline-capable browser application for sailors, liveaboards, passagemakers, expedition vessels, and long-range motor cruisers. It combines vessel records, maintenance, stores, resource endurance, electrical energy planning, passage planning, departure readiness, watchkeeping, ports, procedures, logbook history, findings, and reports in one shared vessel model.

## v1.0 operational release

AFLOAT v1.0.0 completes the first manual/offline operational roadmap. It is intended to remain useful when the vessel has no internet connection and no live vessel-data integration.

Highlights:

- Adaptive **Bridge** for In Port / At Anchor / Underway contexts
- **Voyage** planning, route legs, local GPX import/export, passage scenarios, weather-source comparison, and readiness review
- Dependency-aware **Departure Readiness** with PASS / WATCH / FAIL / UNKNOWN categories and PASS / REVIEW / HOLD disposition
- Immutable-style departure baselines preserving what AFLOAT knew at the decision point
- Structured **Watchkeeping**, end-of-watch handoffs, acknowledgement, and watch history
- **Anchor** scope / rode / swing calculations and anchorage history
- **Vessel** hierarchy, equipment, components, inspections, measurements, maintenance completion, and service history
- **Stores** with hierarchical lockers/bins, stock transactions, expiry/minimum states, and maintenance-demand checks
- **Resources** for fuel, water, provisions, tanks, historical consumption, calibrated readings, and passage endurance
- **POWERWATCH** generation / storage / load modeling, operating profiles, reserve projections, and staged load shedding
- Vessel-specific **Procedures** and checklist execution logs
- Personal **Ports** database and **Ship's Papers** expiration tracking
- Fast **Logbook**, centralized **Findings**, search, relationships, and printable reports
- IndexedDB autosave, portable JSON vessel backups, dry-run **Verify Backup** validation, and local recovery health indicators
- Cruising / Engineering modes plus Light / Dark / Night themes
- Installable PWA shell and offline service worker
- Responsive desktop, tablet, and phone interface with collapsible desktop navigation and mobile drawer
- Keyboard-accessible skip link, reduced-motion support, improved contrast behavior, and touch-safe form controls
- Realistic fictional `SV Meridian` demonstration vessel

## UI verification for v1.0.0

The v1.0 release was rendered in Chromium using the actual AFLOAT HTML shell, CSS, application modules, calculations, demo state, migrations, and UI helpers. A local in-memory persistence adapter was used only to bypass the execution environment's restriction on local HTTP origins during visual verification.

All 12 primary workspaces were checked at three viewport sizes:

- Desktop: 1440 × 1000
- Tablet: 834 × 1112
- Phone: 390 × 844

That produced 36 workspace/viewport checks. All rendered with content present, no page-level horizontal overflow, and no oversized visible blocks. Representative Bridge, Vessel, Settings, and mobile-navigation screenshots were also visually inspected. The mobile drawer and scrim were verified in the open state.

The Chromium pass also found and fixed a pre-existing Passage Report JavaScript parser error that ordinary Node syntax checks had not exposed. This browser-render check is now part of the v1.0 release validation process.

## Safety boundary

AFLOAT is decision-support and recordkeeping software. It is **not** a replacement for official nautical charts, certified navigation equipment, AIS/radar, current weather-routing guidance, COLREGS knowledge, manufacturer maintenance documentation, official regulatory guidance, professional medical advice, or skipper judgment.

The application intentionally uses states such as **PASS / WATCH / FAIL / REVIEW / HOLD / UNKNOWN** rather than declaring that a voyage is safe.

## Running locally

AFLOAT uses ES modules and a service worker, so serve the folder over HTTP rather than double-clicking `index.html`.

### Python

```bash
cd afloat
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a modern browser.

### Static hosting

Upload the entire `afloat/` directory. No build step, application server, account system, or cloud backend is required for v1.0.0.

## Data storage and recovery

Primary vessel data is stored locally in IndexedDB. AFLOAT includes no analytics, telemetry, advertising, or background data upload.

Use **Settings → Export recovery copy** regularly. Clearing browser/site data can remove the local database.

Before replacing current vessel data, **Settings → Verify backup file** can parse, validate, and dry-run migrate a backup without modifying the vessel currently loaded in AFLOAT. Restore remains a separate explicit action.

Schema version remains **v9** in AFLOAT v1.0.0; Batch 5 is an operational/UI/reliability release rather than a destructive data-model revision.

## Project layout

```text
afloat/
├── index.html
├── styles.css
├── manifest.webmanifest
├── sw.js
├── assets/
│   └── icon.svg
├── js/
│   ├── app.js          UI, routing, CRUD, Bridge, reports, recovery
│   ├── calc.js         transparent calculations / readiness logic
│   ├── db.js           IndexedDB persistence + backup download
│   ├── demo.js         blank state + SV Meridian demo state
│   ├── gpx.js          local GPX route import/export
│   ├── migrations.js  validation + non-destructive migration
│   ├── model.js        shared records / relationships / vessel operations
│   └── ui.js           reusable UI / modal helpers
└── tests/
    ├── smoke.mjs
    ├── integrity.mjs
    └── release.mjs
```

## Validation

Run the Node regression suite from the application directory:

```bash
node tests/smoke.mjs
node tests/integrity.mjs
node tests/release.mjs
```

The tests cover legacy migrations, hierarchy cycle protection, maintenance completion/rescheduling, spare consumption, inventory/resource transactions, tank calibration, fuel curves, provisions, route distance, GPX round-trip, energy profiles, load shedding, passage scenarios, readiness dependencies, departure baselines, watch handoff/acknowledgement, position provenance, stale-data handling, v1.0 shell/recovery controls, and PWA references.

## Current integration boundary

Live vessel-data integrations remain intentionally outside the v1.0 critical path. The data model is structured for future adapters such as:

- Signal K
- NMEA 0183
- NMEA 2000 through an onboard gateway/service
- GPS
- AIS-derived context
- battery / tank / engine sensor inputs

GPX route import/export is already implemented locally. Manual entry remains first-class by design.

## Development direction after v1.0

The next roadmap can deepen individual operational areas without compromising the manual/offline core. Planned areas include richer anchoring and port workflows, procedures/evidence/reporting depth, vessel history and analysis, then optional Signal K / GPS / NMEA live integrations.

## Version

AFLOAT **v1.0.0** — schema **v9**
