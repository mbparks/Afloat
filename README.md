# AFLOAT v3.9.1

## v3.9.1 — UI / UX Streamlining

AFLOAT v3.9.1 is a focused interface cleanup with **no schema change**. The sidebar is reorganized into collapsible Operate / Vessel / Review / Connect / System groups, long workspaces gain a sticky section-jump strip, page headers separate the workflow eyebrow from a compact Cruising/Engineering mode badge, and visual density is reduced through tighter cards, tables, and controls. Desktop sidebar collapse still exposes all page icons, while mobile retains the full slide-out navigation.

Cruising remains the operational layer and Engineering remains the deeper model/configuration layer; the cleanup does not duplicate or modify vessel data when switching modes. Schema remains **v36**.

> **v3.9.1:** Same vessel model, less interface friction.


## Batch 20 — Maintenance / Parts Forecasting + Digital Twin Hardening

AFLOAT v3.9.0 completes the planned v3.x Digital Twin roadmap. A new **Forecast** workspace projects explicit maintenance due points through a selected voyage and planning horizon using recorded engine hours, entered expected motor/cycle use, calendar due dates, and recurring task intervals. Forecasted task occurrences are connected to the existing Stores inventory so AFLOAT can aggregate required spare quantities and show shortages before departure. Condition-based work without a deterministic trigger remains **REVIEW / UNKNOWN** rather than receiving an invented due date.

The **Twin** workspace now exposes model health by separate quality dimensions — completeness, freshness, source confidence, historical sample count, variability, and comparability — instead of collapsing them into a composite score. Twin divergences have an explainable **Why?** view showing the exact Designed / Planned / Current / Historical inputs, provenance, current-vs-plan delta, review direction, and configured threshold. New print-quality **Maintenance & Parts Forecast** and **Digital Twin Health** reports preserve those assumptions and quality dimensions.

Schema **v35** adds first-class `maintenanceForecasts` plus forecast preferences. Schema **v36** adds Twin-quality preferences and hardening scaffolding. Existing schema-v34 / AFLOAT v3.7 vessel data migrates non-destructively.

> **v3.9.0 / Batch 20:** Maintenance becomes forecastable. The digital twin becomes explainable about the quality of its own model.


## Batch 19 — Operational Lessons + Uncertainty / Monte Carlo Planning

AFLOAT v3.7.0 turns accumulated vessel experience into contextual decision support and adds an inspectable probabilistic passage-planning layer. **Operational Lessons** are grounded in explicit crew lessons and existing AFLOAT records such as port visits, anchor deployments, maintenance history, findings, and lesson-tagged logbook entries. AFLOAT preserves the source record and labels derived summaries as recorded experience rather than universal guidance.

The Voyage workspace now supports first-class **Uncertainty Scenarios**. A saved model exposes the mean and 1σ for passage speed, delay, fuel burn, motor use, water use, and electrical net energy. AFLOAT uses a deterministic seeded Monte Carlo sampler and reports P05/P10/P50/P90/P95 outcome distributions plus separate percentages of runs that cross the currently entered fuel, water, power, or provision reserve. There is deliberately no combined risk score. The mathematical result is only as credible as the entered distributions and vessel history supporting them.

Schema **v33** adds first-class `lessons` plus Lessons workspace preferences. Schema **v34** adds `uncertaintyScenarios` and uncertainty-planning preferences. Existing schema-v32 / AFLOAT v3.5 vessel data migrates non-destructively.

> **v3.7.0 / Batch 19:** Experience becomes contextual evidence. Uncertainty becomes an inspectable distribution.



## Batch 18 — Passage Replay + “What Changed?” Comparison

AFLOAT v3.5.0 extends the Digital Twin generation with two evidence-first analysis workflows. **Passage Replay** reconstructs the vessel context AFLOAT had recorded at a selected point in a voyage using stored navigation tracks, resource transactions, energy observations, watch/handoff records, procedures, findings, alerts, maintenance history, logbook entries, and explicit voyage decision markers. Replay is reconstruction of recorded evidence; it is not a navigation simulator and it does not infer missing historical values.

**What Changed?** provides a reusable comparison engine for voyage-to-voyage and Twin-baseline-to-baseline analysis. Voyage comparisons summarize duration, recorded distance/average speed, fuel and water consumption, recorded engine run time, electrical load/generation, maintenance completions, findings, procedure runs, decision markers, and log activity. Twin-baseline comparison continues to compare preserved Designed/Planned/Current/Historical quantity snapshots and is the intended path for pre/post-refit, annual, survey, or season comparisons. Changes are shown as explicit B − A deltas and do not establish causation.

Schema **v31** adds first-class `voyageEvents` decision markers plus replay preferences. Schema **v32** adds persistent comparison preferences. Existing schema-v30 / AFLOAT v3.3 vessel data migrates non-destructively. Two print-quality reports are included: **Passage Replay Report** and **What Changed? Comparison**.

> **v3.5.0 / Batch 18:** Recorded voyages become replayable evidence. Difference becomes explicit comparison.


## Batch 17 — Empirical Performance Models + Degradation / Trend Analysis

AFLOAT v3.3.0 extends the Digital Twin generation with explainable **empirical performance models** and **recorded-behavior trend analysis**. The new model layer derives propulsion RPM/speed/fuel-efficiency curves from fuel transactions, builds an observational sailing-performance table from explicit true-wind/boat-speed samples, and groups solar, refrigeration, and watermaker observations by operating context. These are recorded vessel behaviors, not design guarantees.

A new trend engine compares recent observations with an older recorded baseline while preserving sample count, date windows, sample spread, 30-day slope, direction-specific review threshold, source context, and observational confidence. Default trend definitions cover fuel burn near planning RPM, engine coolant temperature, alternator temperature, electrical generation, watermaker production, bilge-cycle frequency, and refrigeration energy. A WATCH means only that the recorded change exceeded the configured review threshold; AFLOAT does not infer a failure cause.

Schema **v29** adds first-class `performanceObservations` and local retention support. Schema **v30** adds configurable `trendDefinitions` and trend-analysis preferences. Existing schema-v28 / AFLOAT v3.1 vessel data migrates non-destructively. The Twin workspace now surfaces behavior-change review items, while the Intelligence workspace provides the full empirical models and evidence windows. A print-quality **Performance & Trend Analysis** report is included.

> **v3.3.0 / Batch 17:** Recorded performance becomes an empirical model. Change becomes an explainable review signal.


## Batch 15 — Local Alerts + Integration Hardening

AFLOAT v2.9.0 completes the Connected Vessel v2.x roadmap with an explainable **local alert engine** and a dedicated **Integration Health** layer. Alerts are evaluated locally from AFLOAT state/live observations and support source-stale, live-threshold, derived-metric, projection, maintenance, and trend-style rules. They can be acknowledged, snoozed, disabled, or converted into logbook observations; they never control vessel equipment.

Integration hardening adds source-candidate tracking, preferred-source policies with automatic fresh-source fallback, configurable source-conflict thresholds, persistent connection/reconnect history, mapped/unmapped update diagnostics, and optional local data-retention policies. Retention is disabled by default and can be dry-run previewed before records are removed.

Schema **v25** adds alert rules/events. Schema **v26** adds integration event history and retention/source-preference settings. Existing schema-v24 vessels migrate non-destructively.

## Batch 13 — Live Engine Room + Live POWERWATCH

AFLOAT v2.7.0 extends the connected-vessel layer through live tankage and vessel-environment observations while preserving the v1.x local/manual fallback. Resources now reconciles live tank sensors against manual/current quantities without silent overwrite, and the environment layer covers standard Signal K outside/cabin/refrigeration/water measurements plus explicitly labeled custom bilge-cycle and watermaker-rate mappings.

Signal K paths remain editable because propulsion/electrical instance names vary by installation. Live values retain path/source/timestamp/freshness. AFLOAT does not infer manufacturer limits and does not control engines, charging sources, inverters, or loads. Explicit snapshot actions can preserve selected live observations into existing AFLOAT measurement/history records.

Schema **v23** adds live-tankage mappings and first-class tank observations. Schema **v24** adds captured environment observations and standard environmental mappings. Schema-v22 vessels migrate non-destructively.


## Batch 12 — NMEA 0183 + NMEA 2000

AFLOAT v2.3.0 adds an optional **read-only direct NMEA 0183 Web Serial adapter** and richer **NMEA 2000 provenance through Signal K/gateways**. Signal K remains the preferred marine-network abstraction. Direct serial supports common navigation/environment sentences (RMC, GGA, HDT, HDG, VTG, VHW, MWV, DBT, DPT, MTW), checksum validation, talker/sentence-rate diagnostics, and a runtime-only 20-line raw sentence buffer. NMEA 2000 is not read directly from CAN; AFLOAT preserves PGN/source/device metadata when Signal K exposes it. Manual data remains first-class and no protocol adapter controls vessel equipment.

Schema **v19** adds direct NMEA 0183 connection settings/records; schema **v20** adds NMEA 2000 integration preferences/source records. Existing schema-v18 vessels migrate non-destructively.


**Vessel Operations, Passage Planning & Maintenance Workbench**


## Batch 16 — Digital Twin Core + Baselines / Comparison

AFLOAT v3.1.0 begins the **Digital Twin** generation. A new **Twin** workspace resolves selected vessel quantities into four explicit states — **DESIGNED / PLANNED / CURRENT / HISTORICAL** — while retaining the provenance, freshness, confidence, and uncertainty of the underlying records. Twin values are views over existing AFLOAT data; they never overwrite the source records that produced them.

The shared Twin engine currently covers engine hours/fuel burn, passage speed, daily water use, freshwater/fuel aboard, house SOC, daily electrical load/generation, and watermaker production. Engineering mode can edit Twin quantity definitions and review the full four-state matrix; Cruising mode emphasizes current values, planned values, and material divergence.

Schema **v27** adds reusable Twin quantity definitions and Twin preferences. Schema **v28** adds immutable-style Twin baseline snapshots and baseline comparison. Existing schema-v26 / AFLOAT v2.9 vessel data migrates non-destructively. Baselines are intended for before/after passage, haulout, refit, survey, annual review, and other explicit state-comparison points.

> **v3.1.0 / Batch 16:** Digital Twin state model + immutable Twin baselines and comparison.

AFLOAT is a local-first, offline-capable browser application for sailors, liveaboards, passagemakers, expedition vessels, and long-range motor cruisers. It combines vessel records, maintenance, stores, resource endurance, electrical energy planning, passage planning, departure readiness, watchkeeping, ports, procedures, logbook history, findings, and reports in one shared vessel model.

## v2.0–v2.1 — Connected Vessel / Signal K + Live Navigation

AFLOAT v2.1.0 begins the **Connected Vessel** generation while preserving the entire v1.x manual/offline workflow. A new **Live Data** workspace provides a Signal K adapter, source-aware normalization, freshness handling, reconnect diagnostics, configurable path mappings, and live-navigation context for Bridge, Voyage, Anchor, and Quick Log workflows.

The default adapter discovers a configured Signal K server through `/signalk`, opens one v1 WebSocket stream, and subscribes only to enabled mappings. The initial mappings cover position, SOG, COG, true heading, depth below transducer, apparent wind speed/angle, and outside pressure. Incoming values retain path, source, observation timestamp, receive timestamp, age, and freshness state.

Manual vessel records remain first-class. AFLOAT can prefer current live navigation, prefer manual values, or select the newest observation; it does not silently rewrite manual planning data. Track recording is rate-limited and local. A synthetic live feed is included for offline/UI verification, while Engineering mode exposes server configuration, diagnostics, mappings, source metadata, and freshness detail.

Batch 11 upgrades persisted data through **schema v17** (data sources and Signal K mappings) and **schema v18** (navigation track history). Existing schema-v16 vessels migrate non-destructively.

## v1.9 historical-intelligence baseline

AFLOAT v1.9.0 added **Historical Vessel Intelligence** to the manual/offline operational release. It derives transparent descriptive models from the vessel’s own recorded fuel, water, electrical, and maintenance history while preserving sample counts, date ranges, spread, provenance, and observational confidence. It is intended to remain useful when the vessel has no internet connection and no live vessel-data integration.

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
- Shared **Digital Twin** state model for Designed / Planned / Current / Historical quantities, material-divergence review, immutable baselines, and before/after comparison
- IndexedDB autosave, portable JSON vessel backups, dry-run **Verify Backup** validation, and local recovery health indicators
- Cruising / Engineering modes plus Light / Dark / Night themes
- Installable PWA shell and offline service worker
- Responsive desktop, tablet, and phone interface with collapsible desktop navigation and mobile drawer
- Keyboard-accessible skip link, reduced-motion support, improved contrast behavior, and touch-safe form controls
- Realistic fictional `SV Meridian` demonstration vessel

## UI verification for v2.1.0

The v2.1.0 self-contained `index.html` bundle is browser-rendered with the SV Meridian demo state and AFLOAT’s synthetic live feed. Verification exercises Cruising and Engineering Live Data views plus Bridge/navigation integration at desktop and phone widths. The transport module is regression-tested with injected mock Fetch/WebSocket implementations; this build has not been tested against a physical onboard Signal K server in the build environment.

Checks include:

- Live Data rendering at desktop and phone widths
- Engineering connection/mapping/diagnostic controls
- Synthetic live position, SOG, COG, heading, depth, wind, and pressure updates
- Bridge use of current live navigation with manual fallback
- Rate-limited track storage and live anchor distance-from-drop calculation
- No browser JavaScript exceptions during the render checks
- No page-level horizontal overflow in the tested views
- Standalone bundle syntax parsing and PWA asset/reference validation

The Node regression suite also validates direct schema-v16 → schema-v18 migration, subscription generation, Signal K discovery/stream resolution, delta normalization, SI-to-display conversions, source provenance, freshness, mocked WebSocket lifecycle, and existing v1.x calculations.

## v3.0–v3.1 — Digital Twin Core + Baselines

The **Twin** workspace is a comparison layer over AFLOAT’s existing vessel records. Each Twin quantity may resolve a Designed/reference state, a voyage/operating Planned state, a selected Current observation, and a Historical model. Missing states remain UNKNOWN rather than being coerced to zero. Current live values retain source/freshness context and historical values retain sample/uncertainty context where available.

Twin divergence is directional rather than a generic percentage alarm: some quantities warrant review when current is above plan, some when it is below plan, and some use absolute deviation. The default review band is configurable in Engineering mode and is a decision-support threshold, not a safety limit.

**Twin baselines** preserve a resolved Twin snapshot at a named point in time. Typical types include before/after passage, haulout, refit, survey, annual review, or manual milestones. Baseline comparison reports value deltas between two preserved snapshots without changing either snapshot or the working vessel model.

A print-quality **Digital Twin State Report** includes the current state matrix, baseline history, and selected baseline comparison.

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

Upload the entire `afloat/` directory. No build step, application server, account system, or cloud backend is required. Live Signal K access is optional; AFLOAT remains fully usable without it.

## Data storage and recovery

Primary vessel data is stored locally in IndexedDB. AFLOAT includes no analytics, telemetry, advertising, or background data upload.

Use **Settings → Export recovery copy** regularly. Clearing browser/site data can remove the local database.

Before replacing current vessel data, **Settings → Verify backup file** can parse, validate, and dry-run migrate a backup without modifying the vessel currently loaded in AFLOAT. Restore remains a separate explicit action.

AFLOAT v2.1.0 uses **schema v18**. Existing v1.9.1/schema-v16 vessel records migrate non-destructively; v17 adds first-class data-source and Signal K mapping records, and v18 adds local navigation-track history.

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
│   ├── signalk.js      Signal K discovery / streaming / normalization adapter
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

The tests cover legacy migrations, hierarchy cycle protection, maintenance completion/rescheduling, spare consumption, inventory/resource transactions, tank calibration, fuel curves, provisions, route distance, GPX round-trip, energy profiles, load shedding, passage scenarios, readiness dependencies, departure baselines, watch handoff/acknowledgement, position provenance, stale-data handling, voyage-window document compliance, procedure execution/skip/completion rules, evidence/timeline/search relationships, historical fuel/water/energy/maintenance models, Signal K discovery/subscription/delta normalization, mocked WebSocket lifecycle, schema-v16 → v18 migration, shell/recovery controls, and PWA references.

## Connected-vessel boundary

Signal K and live GPS-derived navigation are now optional AFLOAT inputs. The browser adapter is intentionally **read/observe/analyze/log only**: AFLOAT does not steer the vessel, control the engine, switch electrical loads, or replace certified navigation/anchor alarms. Manual entry and imported data remain available when the vessel network is absent.

Current live mappings are intentionally limited to selected navigation/environment quantities. Future v2.x batches can add NMEA adapters, engine/electrical/tank/environment ingestion, source reconciliation, alerts, and integration hardening without coupling the UI directly to marine-bus protocols.

## Development direction after Batch 11

The next v2.x batch is NMEA 0183 / NMEA 2000 ingestion. The preferred path remains Signal K/gateway normalization first, with optional direct browser serial support treated as a secondary adapter. Later batches add live engine/electrical/tank/environment data, local alerts, and integration hardening.

## Version

AFLOAT **v2.9.0** — schema **v26**


## Standalone rendering

The primary `index.html` continues to inline the complete AFLOAT stylesheet and a dependency-free application bundle. It therefore renders when opened directly as a standalone HTML file or when a hosting/preview layer serves only `index.html`. The modular CSS/JS files remain in the package for source inspection and PWA development. Service workers still require HTTP/HTTPS and are not available from `file://`.


## v1.4 Batch 7 — Ship’s Papers + Procedures

Ship’s Papers now distinguish departure-required records from informational documents and evaluate expiration/validity against the actual voyage window. Planned departure and arrival dates are supported before a passage is active. Document records include holder/crew, authority, jurisdiction, source/verification dates, confidence, and renewal notes.

Procedures now create first-class execution records immediately when started. Completed steps are timestamped, skipped steps require a reason, interrupted runs can be resumed, and completed or aborted runs remain in permanent execution history. The Procedures workspace also stores vessel-specific prerequisites, warnings, equipment locations, required tools, required parts, and notes.

Schema v12/v13 migrations preserve existing v1.2/schema-v11 vessel records. The offline cache namespace in the current release is `afloat-v2.3.0`.

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


## v2.0–v2.1 — Connected Vessel / Signal K + Live Navigation

AFLOAT can now connect directly to a Signal K server from the browser using `/signalk` discovery and the v1 WebSocket delta stream. The adapter subscribes only to configured paths and normalizes Signal K SI units into AFLOAT display quantities while retaining path, source, observation timestamp, age, and freshness.

The Live Data workspace includes connection diagnostics, editable mappings, source precedence for navigation, automatic reconnect, a synthetic demo feed, live position/SOG/COG/heading/depth/wind/pressure, voyage distance/ETA estimates, and rate-limited local track recording. Quick Log can snapshot current live position and conditions. Manual entry is never silently overwritten, and AFLOAT remains explicitly not a certified chartplotter or navigation alarm.

Browser security may block `ws://`/`http://` Signal K from an AFLOAT page served over HTTPS. Use an appropriately secured Signal K endpoint or serve AFLOAT on the trusted vessel LAN. Session tokens are not written to the vessel backup.
