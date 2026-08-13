# AFLOAT v1.9.0

**Vessel Operations, Passage Planning & Maintenance Workbench**

AFLOAT is a local-first, offline-capable browser application for sailors, liveaboards, passagemakers, expedition vessels, and long-range motor cruisers. It combines vessel records, maintenance, stores, resource endurance, electrical energy planning, passage planning, departure readiness, watchkeeping, ports, procedures, logbook history, findings, and reports in one shared vessel model.

## v1.0 operational release

AFLOAT v1.9.0 adds **Historical Vessel Intelligence** to the manual/offline operational release. It derives transparent descriptive models from the vessel’s own recorded fuel, water, electrical, and maintenance history while preserving sample counts, date ranges, spread, provenance, and observational confidence. It is intended to remain useful when the vessel has no internet connection and no live vessel-data integration.

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
- Fast **Logbook**, first-class **Evidence Cabinet**, unified **Vessel Timeline**, centralized **Findings**, relationship-aware **Vessel Knowledge Search**, and print-quality evidence-aware reports
- **Historical Vessel Intelligence** with fuel-by-RPM observations, water-use history, predicted-vs-observed energy, repeated maintenance intervals, sample counts/date ranges, 1σ spread, and explicit observational confidence
- IndexedDB autosave, portable JSON vessel backups, dry-run **Verify Backup** validation, and local recovery health indicators
- Cruising / Engineering modes plus Light / Dark / Night themes
- Installable PWA shell and offline service worker
- Responsive desktop, tablet, and phone interface with collapsible desktop navigation and mobile drawer
- Keyboard-accessible skip link, reduced-motion support, improved contrast behavior, and touch-safe form controls
- Realistic fictional `SV Meridian` demonstration vessel

## UI verification for v1.9.0

Batch 10 was parsed and rendered in Chromium from the actual self-contained `index.html` bundle with the SV Meridian demo state. Because the verification harness injects the HTML into an opaque browser document, IndexedDB startup is suppressed only in the render harness and the demo vessel is seeded after the application bundle parses. The same inline CSS and classic-script application bundle shipped in the standalone file are exercised.

Checks included:

- Historical Vessel Intelligence — desktop 1440 × 1000
- Historical Vessel Intelligence — tablet 834 × 1112
- Historical Vessel Intelligence — phone 390 × 844
- Fuel, water, energy, and maintenance historical model rendering
- No browser JavaScript exceptions during the render checks
- No page-level horizontal overflow at any tested viewport
- Standalone bundle syntax parsing and PWA asset/reference validation

The Node regression suite also validates direct migration to schema v16 and the historical model calculations.

## Safety boundary

AFLOAT is decision-support and recordkeeping software. It is **not** a replacement for official nautical charts, certified navigation equipment, AIS/radar, current weather-routing guidance, COLREGS knowledge, manufacturer maintenance documentation, official regulatory guidance, professional medical advice, or skipper judgment.

The application intentionally uses states such as **PASS / WATCH / FAIL / REVIEW / HOLD / UNKNOWN** rather than declaring that a voyage is safe.

## Running locally

For the full installable PWA/offline-cache behavior, serve the folder over HTTP. The packaged `index.html` is also self-contained and can be opened directly for standalone use; service-worker installation is simply unavailable under `file://`.

### Python

```bash
cd afloat
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a modern browser.

### Static hosting

Upload the entire `afloat/` directory. No build step, application server, account system, or cloud backend is required for v1.9.0.

## Data storage and recovery

Primary vessel data is stored locally in IndexedDB. AFLOAT includes no analytics, telemetry, advertising, or background data upload.

Use **Settings → Export recovery copy** regularly. Clearing browser/site data can remove the local database.

Before replacing current vessel data, **Settings → Verify backup file** can parse, validate, and dry-run migrate a backup without modifying the vessel currently loaded in AFLOAT. Restore remains a separate explicit action.

AFLOAT v1.9.0 uses **schema v16**. Existing v1.8/schema-v15 vessel records migrate non-destructively; v16 adds first-class daily energy-observation records used by the historical intelligence workbench.

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
│   ├── ui.js           reusable UI / modal helpers
│   └── afloat.bundle.js self-contained classic-script runtime used by index.html
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

The tests cover legacy migrations, hierarchy cycle protection, maintenance completion/rescheduling, spare consumption, inventory/resource transactions, tank calibration, fuel curves, provisions, route distance, GPX round-trip, energy profiles, load shedding, passage scenarios, readiness dependencies, departure baselines, watch handoff/acknowledgement, position provenance, stale-data handling, voyage-window document compliance, procedure execution/skip/completion rules, evidence/timeline/search relationships, historical fuel/water/energy/maintenance models, v1.0 shell/recovery controls, and PWA references.

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

The v1.x manual/offline knowledge roadmap is now substantially complete. The next major development phase can begin optional Signal K / GPS / NMEA live-data integration while keeping manual observations, explicit provenance, and the offline core as the baseline.

## Version

AFLOAT **v1.9.0** — schema **v16**


## Standalone rendering

The primary `index.html` continues to inline the complete AFLOAT stylesheet and a dependency-free application bundle. It therefore renders when opened directly as a standalone HTML file or when a hosting/preview layer serves only `index.html`. The modular CSS/JS files remain in the package for source inspection and PWA development. Service workers still require HTTP/HTTPS and are not available from `file://`.


## v1.4 Batch 7 — Ship’s Papers + Procedures

Ship’s Papers now distinguish departure-required records from informational documents and evaluate expiration/validity against the actual voyage window. Planned departure and arrival dates are supported before a passage is active. Document records include holder/crew, authority, jurisdiction, source/verification dates, confidence, and renewal notes.

Procedures now create first-class execution records immediately when started. Completed steps are timestamped, skipped steps require a reason, interrupted runs can be resumed, and completed or aborted runs remain in permanent execution history. The Procedures workspace also stores vessel-specific prerequisites, warnings, equipment locations, required tools, required parts, and notes.

Schema v12/v13 migrations preserve existing v1.2/schema-v11 vessel records. The offline cache namespace is `afloat-v1.9.0`.

## v1.2 Batch 6

The Anchor workspace now models ground tackle, deployments, position observations, and anchorage experience. The Ports workspace separates long-lived place knowledge from first-class visit history, preserving arrival/departure, services, quantities, notes, and lessons for each stop.


## v1.5–v1.6 — Evidence Cabinet & Vessel Timeline

AFLOAT now includes a first-class **History** workspace. Evidence items can store provenance and an optional embedded local file (up to 5 MB per item) and can link to multiple vessel records through the shared relationship model. The Vessel Timeline derives chronological events from voyages, maintenance history, inspections, findings, port visits, procedure executions, anchor deployments, equipment commissioning, evidence, incidents, and custom milestones. Timeline filters support event type, vessel system, voyage, and text search.

Embedded evidence remains local to the browser and is included in AFLOAT JSON backups; large files can make backups substantially larger.


## v1.7–v1.8 — Reports & Vessel Knowledge Search

Batch 9 upgrades AFLOAT reports into local print previews with vessel/report metadata, repeating table headers, explicit UNKNOWN values, assumptions, evidence references, and print/PDF controls. The Report Center now includes Port Arrival Brief, Anchorage Report, and Incident Report in addition to the existing operational reports.

Global search is now relationship-aware. A direct text match becomes a root in the shared vessel graph and AFLOAT expands connected records up to two relationship hops, preserving a visible connection path. Searching a manufacturer, component, part, place, or procedure can therefore surface connected equipment, spares, maintenance, inspections, measurements, findings, evidence, and procedures even when those related records do not contain the original search term.

Batch 9 is a computation/UI release and does not change the persisted record schema; schema remains v15.


## v1.9 — Historical Vessel Intelligence

Batch 10 adds an **Intelligence** workspace derived only from recorded vessel history. Fuel observations require explicit consumed quantity and engine-run hours and are grouped by recorded RPM; observed speed is calculated only when distance is also recorded. Water observations require explicit duration and optionally crew count for per-person rates. Energy observations compare recorded daily consumption/generation with the selected AFLOAT operating-profile prediction. Maintenance intervals are derived from repeated completion records using engine hours when available, otherwise calendar time.

Every model exposes sample count, observed date range, arithmetic mean/median where relevant, sample standard deviation (1σ) when there is enough data, source records, and a deliberately simple observational-confidence label. These observations never silently replace planning assumptions or manufacturer maintenance intervals. Schema v16 adds first-class `energyObservations`; existing schema-v15 vessel data migrates non-destructively.
