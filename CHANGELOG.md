# AFLOAT Changelog

## v3.9.1 — UI / UX Streamlining

- Reorganized the 20-item sidebar into collapsible **Operate / Vessel / Review / Connect / System** groups.
- Automatically keeps the active page's navigation group open.
- Preserved full icon access when the desktop sidebar is collapsed.
- Added sticky **Jump to** section navigation on long workspaces including Voyage, Vessel, Resources, Ports, History, Intelligence, Twin, Forecast, and Settings.
- Separated the page workflow eyebrow from a compact **Cruising / Engineering** mode badge.
- Reduced top-bar, card, metric, table, and section spacing without reducing touch-target sizing.
- Removed regular card drop shadows for a calmer instrument-panel hierarchy.
- Reduced low-priority action prominence on compact/mobile layouts.
- Tightened sidebar branding and vessel summary while retaining vessel status/context.
- Kept Cruising/Engineering data semantics unchanged; no vessel records are duplicated or mutated by the interface mode.
- Schema remains **v36**; no data migration is required from v3.9.0.
- Updated the PWA cache namespace to `afloat-v3.9.1`.


## v3.9.0 — Batch 20: Maintenance / Parts Forecasting + Digital Twin Hardening

- Added a top-level **Forecast** workspace.
- Added first-class `maintenanceForecasts` with voyage, horizon, expected engine-use, expected cycle-use, and fallback duration assumptions.
- Added projection of explicit engine-hour, calendar, and cycle maintenance due points into before-departure / during-passage / within-horizon states.
- Added recurrence counting for repeated hour/date/cycle maintenance intervals.
- Added linked spare-parts aggregation across all forecast task occurrences.
- Added onboard-vs-required comparison and explicit forecast shortage review; forecast calculations never consume inventory.
- Kept condition-based tasks without deterministic due points as REVIEW / UNKNOWN instead of inventing dates.
- Added unquantified consumables review while preserving the existing free-text consumable model.
- Added a print-quality **Maintenance & Parts Forecast** report.
- Added per-quantity Digital Twin data-quality dimensions: completeness, freshness, source confidence, historical N, variability, and comparability.
- Added category-level **Digital Twin Health** without a composite quality score.
- Added **Why?** explainability for Twin divergences, including source inputs, delta, threshold/direction, and quality dimensions.
- Added a print-quality **Digital Twin Health** report.
- Added schema **v35** (`maintenanceForecasts`) and **v36** (Twin-quality preferences) with direct non-destructive v34→v36 migration.
- Updated the PWA cache namespace to `afloat-v3.9.0`.
- Corrected the standalone icon link to a packaged icon asset.

## v3.7.0 — Batch 19: Operational Lessons + Uncertainty / Monte Carlo Planning

- Added a top-level **Lessons** workspace for contextual vessel-specific experience.
- Added first-class structured `lessons` records with Event → Observation → Decision → Result → Lesson fields, source, confidence, tags, and links to voyage/port/anchorage/equipment/system context.
- Added contextual lesson retrieval from explicit lessons plus existing port visits, anchor deployments, maintenance history, findings, and lesson-tagged voyage logs.
- Preserved source-record traceability; derived lesson summaries remain identified as recorded experience and do not establish future operating limits.
- Added an **Operational Lessons Report**.
- Added first-class `uncertaintyScenarios` in the Voyage workspace.
- Added deterministic seeded Monte Carlo analysis for passage speed, delay, fuel burn, motor hours, water use, and electrical net energy.
- Added P05 / P10 / P50 / P90 / P95 distributions for passage duration and resource margins.
- Added separate fuel, water, power, and provision preferred-reserve breach frequencies; no combined risk score is generated.
- Added explicit input-distribution tables in Engineering mode and a print-quality **Passage Uncertainty Report**.
- Added schema **v33** (`lessons`) and **v34** (`uncertaintyScenarios`) with direct non-destructive v32→v34 migration.
- PWA cache namespace updated to `afloat-v3.7.0`.

## v3.5.0 — Batch 18: Passage Replay + What Changed? Comparison

- Added a top-level **Replay** workspace.
- Added first-class `voyageEvents` for explicit decision/course/sail/engine/energy/resource/repair/weather markers.
- Passage Replay reconstructs recorded state at a selected voyage timestamp using stored navigation tracks, resource transactions, energy observations, environment observations, watches, findings, logs, procedures, alerts, and maintenance history.
- Added a timeline scrubber and event-jump workflow; replay does not synthesize missing historical values.
- Added a reusable comparison engine for **voyage vs voyage** and **Twin baseline vs baseline**.
- Voyage comparison includes duration, recorded distance and average speed, planned speed, fuel/water consumed, recorded engine run time, electrical load/generation, maintenance completions, findings, procedure runs, decision markers, and log entries.
- Twin baseline comparison remains the path for pre/post-refit, survey, annual, and season state comparisons.
- Added explicit B − A value and percentage deltas with a causation/diagnosis boundary.
- Added **Passage Replay Report** and **What Changed? Comparison** reports.
- Added Replay decision markers to the unified Vessel Timeline and shared inspector/relationship/search model.
- Added a prior SV Meridian Annapolis → Bermuda demo passage plus replay tracks and decision markers for side-by-side comparison.
- Added schema **v31** (`voyageEvents` + replay preferences) and **v32** (comparison preferences), with direct non-destructive v30→v32 migration.
- PWA cache namespace updated to `afloat-v3.5.0`.


## v3.3.0 — Batch 17: Empirical Performance Models + Degradation / Trend Analysis

- Added first-class `performanceObservations` for recorded sailing, solar, refrigeration, and watermaker behavior.
- Expanded the empirical propulsion model to show RPM, observed speed, fuel burn, and nautical-mile-per-fuel-unit efficiency with N, date range, spread, and confidence.
- Added observational sailing performance grouped by true-wind speed and angle; AFLOAT explicitly labels this as recorded performance rather than a design polar.
- Added solar-production models grouped by operating/weather context.
- Added refrigeration-energy models grouped by cabin-temperature band.
- Added watermaker-production models grouped by sea-temperature band.
- Added configurable behavior-change analysis comparing a recent observation window against older recorded history.
- Trend results preserve baseline/recent N, date windows, means, percent change, 30-day slope, direction-specific review threshold, and observational confidence.
- Added default trend definitions for fuel burn near planning RPM, engine coolant temperature, alternator temperature, electrical generation, watermaker output, bilge-cycle frequency, and refrigeration energy.
- Added **Behavior change review** to the Twin workspace so material recorded changes are visible beside model-vs-current differences.
- Added Engineering controls for performance-observation entry and trend settings.
- Added a print-quality **Performance & Trend Analysis** report.
- Added performance observations to global relationship/search/backup/retention handling.
- Added schema **v29** (`performanceObservations`) and schema **v30** (`trendDefinitions` + trend preferences) with direct non-destructive v28→v30 migration.
- Maintained the Digital Twin boundary: trends are observational review signals, not fault diagnoses, safety declarations, or manufacturer-limit replacements.

## v3.1.0 — Batch 16: Digital Twin Core + Baselines / Comparison

- Added a top-level **Twin** workspace.
- Added a shared Twin quantity model with explicit **DESIGNED / PLANNED / CURRENT / HISTORICAL** states.
- Twin values resolve from existing AFLOAT records/live observations and do not overwrite their source data.
- Added source/freshness/confidence/uncertainty context where the underlying state provides it.
- Added directional current-vs-plan divergence semantics (`above-plan`, `below-plan`, `absolute`, or none) and a configurable Engineering review band.
- Added Cruising and Engineering Twin matrices with materially different levels of detail.
- Added schema **v27** with reusable Twin quantity definitions and Twin preferences.
- Added schema **v28** with immutable-style Twin baseline snapshots.
- Added named baseline capture for passage/refit/haulout/survey/annual/manual comparison points.
- Added baseline A/B comparison with quantity-by-quantity deltas.
- Added two realistic SV Meridian demo baselines to exercise comparison.
- Added a print-quality **Digital Twin State Report**.
- Added Twin quantities/baselines to the shared relationship/inspector model.
- Added direct non-destructive schema-v26 → schema-v28 migration coverage.
- PWA cache namespace updated to `afloat-v3.1.0`.
- Maintained AFLOAT’s decision-support boundary: Twin divergence is descriptive and does not declare a vessel or voyage safe/unsafe.

## v2.9.0 — Batch 15: Local Alert Engine + Integration Hardening

- Added a dedicated **Alerts** workspace with fully local rule evaluation.
- Added source-stale, live-threshold, derived-metric, maintenance, resource-margin, battery-reserve, and bilge-trend rule support.
- Added INFO / WATCH / HIGH / CRITICAL severity with explicit WHAT / WHY / SOURCE / ACTION context.
- Added acknowledge, snooze, enable/disable, and alert-to-logbook workflows.
- Added source-candidate tracking so multiple current sources can coexist without silent replacement.
- Added preferred-source selection with automatic fallback to a fresh alternate when the preferred source becomes stale.
- Added configurable numeric, position, and angle source-conflict thresholds.
- Added an Engineering-only **Integration Health** console with update rate, stale/unknown mappings, current source conflicts, reconnect counts, and persistent connection history.
- Added optional local retention policies for navigation tracks, tank/environment/energy observations, measurements, and alert-event history. Retention is disabled by default and includes a dry-run preview.
- Added automatic retention only when the user explicitly enables the policy.
- Added alerts to Bridge Attention without replacing existing Findings.
- Added schema v25/v26 non-destructive migrations.
- Maintained read/observe/analyze/log-only connected-vessel boundary; no vessel control was added.

## v2.7.0 — Batch 14: Live Tankage + Vessel Environment

- Live tank sensor mappings with explicit tank targets and calibration-aware quantity estimates.
- Sensor/manual tank reconciliation with configurable disagreement review band.
- First-class tank observation history; adopting a sensor value is an explicit user action.
- Live outside/cabin humidity and temperature, refrigerator/freezer, and sea-water environment data.
- First-class captured environment snapshots.
- Bilge-cycle and watermaker-production support via explicitly labeled custom mappings (not standard Signal K keys).
- Synthetic feed expanded for tankage/environment testing.
- Schema v24 (v23 tankage, v24 environment).

# Changelog

## v2.7.0 — Batch 13: Live Engine Room + Live POWERWATCH

- Added live engine Signal K mappings for RPM, run time/engine hours, coolant temperature, oil pressure, alternator voltage, fuel rate, and optional exhaust temperature.
- Added unit normalization for Hz→RPM, seconds→hours, Pa→psi, m³/s→US gal/hr, and ratio→percent.
- Added a read-only **Live Engine Room** to Vessel with freshness/source provenance and explicit snapshot capture into measurement history.
- Added live electrical mappings for house battery SOC/voltage/current/temperature, alternator voltage/current/temperature, solar voltage/current, inverter DC current, and inverter AC real power.
- Added **Live POWERWATCH** to Resources with observed SOC/current, instantaneous battery/alternator/solar power, inverter load, and transparent time-to-reserve estimate.
- Added low-confidence diagnostic electrical snapshot capture into existing Energy Observation history; AFLOAT labels instantaneous annualization limitations explicitly.
- Expanded synthetic connected-vessel feed to exercise engine and electrical UI offline.
- Added schema v21/v22 non-destructive migrations for engine/electrical settings and default mappings.
- Expanded live rendering so Vessel and Resources update when connected observations arrive.
- Maintained read/observe/analyze/log-only safety boundary: no engine, charging, inverter, or load control.

## v2.3.0 — Batch 12: NMEA 0183 + NMEA 2000

- Added optional read-only browser-direct NMEA 0183 Web Serial adapter.
- Added checksum validation and diagnostics for talker IDs, sentence types, valid/invalid counts, parse errors, and mapped values.
- Added parsers for RMC, GGA, HDT, HDG, VTG, VHW, MWV, DBT, DPT, and MTW.
- Direct NMEA observations feed the same AFLOAT live-data bus used by Signal K without overwriting manual records.
- Raw direct-serial sentence diagnostics are runtime-only and capped at 20 lines.
- Added NMEA 2000 source/PGN/device provenance display when exposed through Signal K.
- Signal K/gateway remains the preferred NMEA 0183 and NMEA 2000 integration path.
- No direct CAN/NMEA 2000 control and no vessel-control functions were added.
- Schema v19 adds NMEA 0183 connection configuration; schema v20 adds NMEA 2000 preferences/source metadata scaffolding.
- PWA cache namespace updated to `afloat-v2.3.0`.


## v2.1.0 — Batch 11: Signal K Core + Live Navigation

- Added browser-direct Signal K `/signalk` discovery and WebSocket delta-stream adapter.
- Added path subscription manager, source provenance, explicit unit normalization, freshness/age state, reconnect diagnostics, and runtime-only session token support.
- Added Live Data workspace with Cruising and Engineering complexity layers.
- Added live navigation for position, SOG, COG, true heading, depth, apparent wind, and pressure.
- Added source precedence: prefer current live, prefer manual, or newest observation.
- Added rate-limited local navigation track history and voyage distance/ETA estimates.
- Added live anchor distance-from-drop observation.
- Quick Log can snapshot current live position and conditions.
- Added synthetic live feed for offline/demo verification.
- Schema v17 adds data sources / Signal K mappings; schema v18 adds navigation tracks.
- Manual/offline operation remains fully functional and live data never silently replaces manual planning records.

## v1.9.1 — Cruising / Engineering UI cleanup

- Turned the lower-left Cruising / Engineering control into a real complexity-mode switch over the same vessel data.
- Cruising now emphasizes operational status, margins, current history, and actions while suppressing configuration-heavy detail.
- Cruising hides vessel topology editing, tank calibration/internal tank setup, raw resource/stock transaction audit trails, POWERWATCH load/source/storage configuration, route-construction controls, detailed historical-statistics tables, relationship/provenance panels, internal record IDs, and destructive record-management actions.
- Engineering restores configuration, calibration, assumptions, provenance, relationships, statistical detail, model internals, and record-management controls.
- Added an explicit mode caption and current-mode workspace eyebrow; mode buttons now expose `aria-pressed` state and descriptive tooltips.
- Simplified the shared Record Inspector in Cruising while preserving normal operational edit/evidence workflows.
- Verified repeated mode switching does not mutate the underlying vessel state.
- Fixed a pre-existing Settings/Data Health runtime defect caused by missing `dataHealth()` and `totalRecordCount()` helpers.
- Persisted schema remains **v16**; no data migration is required from v1.9.0.
- Updated PWA cache namespace to `afloat-v1.9.1`.
- Added mode-cleanup regression coverage plus Chromium comparison renders across ten workspaces in both modes and a fresh 390 × 844 mobile-drawer verification.

## v1.9.0 — Batch 10: Historical Vessel Intelligence

- Added a dedicated **Intelligence** workspace for vessel-specific historical observations.
- Added fuel-performance history derived from explicit consumed quantity + engine-run hours, grouped by recorded RPM; speed is derived only when distance is also recorded.
- Added water-use history with whole-vessel and optional per-person rates when duration and crew count are known.
- Added first-class daily energy observations comparing predicted vs. actual load and generation.
- Added repeated maintenance-interval observations using engine-hour intervals when available, otherwise calendar intervals.
- Added sample mean/median, sample standard deviation (1σ), date range, source, and observational-confidence metadata.
- Added plain-language vessel observations that retain sample size and provenance and are explicitly descriptive rather than prescriptive.
- Extended resource transactions with optional engine-run hours, RPM, distance, crew count, and operating context.
- Added a Historical Vessel Intelligence report to the Report Center.
- Updated the SV Meridian demo with synthetic repeated fuel, water, electrical, and maintenance observations.
- Added schema v16 non-destructive migration from v1.8/schema-v15 for `energyObservations`.
- Updated PWA cache namespace to `afloat-v1.9.0`.
- Added v1.9 model/migration regression coverage and desktop/tablet/phone Chromium render verification.

## v1.8.0 — Batch 9: Reports + Vessel Knowledge Search

- Upgraded report output to print-quality local previews with vessel metadata, report IDs, schema/app version, repeating headers, print-safe page breaks, and explicit data-quality notes.
- Added evidence references to major operational report tables and common evidence/assumption appendices.
- Added Port Arrival Brief, Anchorage Report, and Incident Report.
- Expanded Report Center descriptions and report-health metrics.
- Replaced flat JSON-string search with relationship-aware Vessel Knowledge Search.
- Search ranks direct matches and expands connected records up to two hops with visible relationship paths.
- Added knowledge-search regression coverage using manufacturer-only search terms to prove connected records surface without containing the query text.
- Updated PWA cache namespace to `afloat-v1.8.0`.
- Persisted schema remains v15; no data migration is required from v1.6.0.

## v1.6.0 — Batch 8 — Evidence Cabinet + Vessel Timeline

- Added a first-class **History** workspace.
- Added first-class evidence metadata with title, kind, observed/captured time, creator, source, original filename, MIME type, byte size, and notes.
- Added optional local embedded evidence files with a 5 MB per-item guardrail.
- Added image previews and local evidence open/download behavior.
- Reused AFLOAT's shared relationship model so a single evidence item can support multiple inspections, findings, maintenance records, equipment records, voyages, ports, documents, and other records without duplicating the file payload.
- Added a unified Vessel Timeline derived from voyages, maintenance history, inspections, findings, port visits, procedure executions, anchor deployments, equipment commissioning, evidence records, incidents, and lessons.
- Added first-class custom Timeline Milestones for significant events that do not already have another AFLOAT source record.
- Added timeline filters for event type, vessel system, voyage, and free-text search.
- Added Evidence & Vessel Timeline reporting.
- Added schema v14/v15 non-destructive migrations from the v1.4/schema-v13 model.
- Updated SV Meridian demo data with linked evidence records and a refit milestone.
- Updated offline cache namespace to `afloat-v1.6.0`.
- Verified History, Logbook, and Vessel rendering at desktop, tablet, and phone sizes with no page-level horizontal overflow or browser JavaScript errors.

## v1.4.0 — Batch 7 — Ship’s Papers + Procedures

- Upgraded schema from v11 to v13 with non-destructive document/procedure migrations.
- Added planned voyage departure and arrival dates for pre-departure compliance checks.
- Expanded Ship’s Papers with category, holder/crew, issuing authority, jurisdiction, source date, verification date, confidence, renewal notes, and departure-readiness applicability.
- Added voyage-window document compliance so records can PASS, WATCH, FAIL, or UNKNOWN based on actual planned/active passage dates rather than only a generic expiry horizon.
- Readiness now evaluates departure-required documents individually and exposes document-specific dependencies/reasons.
- Expanded Ship’s Papers workspace and report with required/informational distinction and voyage compliance status.
- Expanded vessel-specific procedures with prerequisites, warnings, equipment locations, required tools, required parts, and notes.
- Added first-class persistent Procedure Execution records.
- Starting a procedure immediately creates an execution record that can be resumed after interruption.
- Completed checklist steps receive timestamps.
- Skipped steps require an explicit reason and may carry notes.
- Completion is blocked until every step is completed or explicitly skipped; executions may also be aborted and preserved.
- Added permanent procedure execution history and Procedure Execution History reporting.
- Updated SV Meridian demo data with voyage-window paper review and completed procedure history.
- Updated offline cache namespace to `afloat-v1.4.0`.
- Preserved the self-contained `index.html` deployment model introduced by the rendering hotfix.
- Fixed a standalone bundling regression discovered during Chromium validation where `export` tokens from async database functions remained in the inline classic-script bundle.
- Verified representative Ports/Ship’s Papers and Procedures screens at desktop and phone sizes plus the mobile live-execution modal with no page-level horizontal overflow or browser JavaScript errors.

## v1.2.0 — Batch 6 — Anchor + Ports / Anchorages

- Added first-class ground-tackle configurations with primary/secondary roles, anchor/rode details, and usable rode length.
- Added first-class anchor deployment records linked to anchorage and ground tackle.
- Added anchor position observations for deployment history and drag observations.
- Expanded anchor planning to show effective depth, required rode, rode margin, conservative swing radius, and hazard-clearance margin.
- Added recorded anchorage-experience summaries including deployment count, maximum recorded wind, drag observations, and reset count.
- Expanded anchorage knowledge with approach, hazards, night-approach, shore-access, and dinghy-landing notes.
- Added first-class port visit history so individual stops never overwrite long-lived port knowledge.
- Expanded port records with clearance, harbor-master, marina, shore-service, communications, contact, and source/verification fields.
- Added visit notes, services used, fuel/water taken aboard, berth/location, and lessons learned.
- Added schema v10/v11 non-destructive migrations from the v1.0.1 schema v9 model.
- Bumped offline cache namespace to afloat-v1.2.0.

## 1.0.1 — Rendering hotfix

- Made `index.html` self-rendering by inlining the full release stylesheet.
- Bundled AFLOAT's browser modules into an inline dependency-free application script.
- The app now renders when `index.html` is opened directly or previewed without sibling asset routing.
- Retained the modular source files and PWA assets for normal hosted deployment.
- Added `js/afloat.bundle.js` as a packaged/debuggable copy of the bundled runtime.
- Service-worker registration remains best-effort and gracefully unavailable under `file://`.

## v1.0.0 — Batch 5: Operational Release

- Completed the first manual/offline AFLOAT operational roadmap.
- Hardened the application shell across desktop, tablet, and phone layouts.
- Added persistent desktop sidebar collapse and a touch-oriented mobile navigation drawer with scrim.
- Added touch-safe form sizing, phone bottom-sheet modal behavior, responsive metric/readiness layouts, and safer long-text wrapping.
- Corrected light-mode sidebar theming and improved Night-mode glare handling.
- Added keyboard skip navigation, current-page ARIA state, reduced-motion support, contrast preference support, and stronger focus/navigation behavior.
- Added explicit network-state display separate from IndexedDB autosave state.
- Added local recovery-health indicators for schema, shared-record count, last local change, and last exported backup.
- Added **Verify Backup** dry-run validation/migration so a recovery file can be checked without replacing current vessel data.
- Strengthened restore validation so backups are validated before and after migration before local data is replaced.
- Added backup metadata including AFLOAT version, schema version, export timestamp, and shared-record count.
- Added fatal startup recovery UI for database-load failure rather than silently entering first launch.
- Added global runtime/unhandled-rejection logging for clearer browser diagnostics.
- Fixed a pre-existing Passage Report template-expression parser error discovered by the Chromium render pass.
- Updated service-worker cache namespace to `afloat-v1.0.0`.
- Preserved schema v9; v1.0.0 requires no destructive data migration from v0.9.0.
- Verified all 12 primary workspaces at desktop (1440×1000), tablet (834×1112), and phone (390×844): 36 render checks with no page-level horizontal overflow or oversized visible blocks.
- Visually inspected representative Bridge, Vessel, Settings, mobile Bridge, mobile Settings, and open mobile-navigation states.
- Extended release validation for v1.0 shell, recovery controls, responsive CSS, application version, service-worker cache, and report-parser regression.

## 0.1.0 — 2026-08-12

Initial working AFLOAT release.

- Added multi-workspace application shell and responsive marine-instrument UI.
- Added local IndexedDB persistence, autosave status, import/export, PWA manifest, and service worker.
- Added Bridge, Voyage, Anchor, Vessel, Resources, Stores, Procedures, Ports, Logbook, Findings, Reports, and Settings.
- Added category-based departure readiness and explicit UNKNOWN handling.
- Added fuel range, water/resource endurance, energy, anchor scope/swing, and maintenance calculations.
- Added fictional SV Meridian demonstration data.
- Added Cruising / Engineering modes and Light / Dark / Night themes.
- Added initial print-to-PDF report generator.
- Kept Signal K, NMEA, GPS/GPX live integration as future adapter boundaries.

## v0.3.0 — Batch 1: Relational Vessel Workbench

- Upgraded data schema from v1 to v3 with automatic in-browser migration.
- Added stable record metadata (`createdAt`, `updatedAt`, archive state) and migration persistence.
- Added shared `Component`, `Inspection`, `MaintenanceHistory`, and explicit relationship records.
- Added a common right-side Record Inspector with edit, duplicate, archive/restore, delete, and Related To linking.
- Added relationship-aware global search across the shared vessel model.
- Reworked Vessel into an editable system hierarchy with drag/drop parent assignment.
- Expanded equipment records with condition, life, service/inspection intervals, commissioning/install/purchase dates, cycles, and failure consequence.
- Added component records beneath equipment.
- Expanded maintenance task types: engine-hours, calendar, cycles, seasonal, condition-based, and corrective.
- Added maintenance completion workflow with permanent service history, optional spare consumption, logbook entry, and automatic next-due calculation.
- Added inspections with condition/result tracking and equipment condition propagation for poor/failed results.
- Added editable measurement records, grouped latest values, sample counts, and simple historical trend indication.
- Added required-spare availability display directly on maintenance tasks.
- Added archived-record visibility control and vessel-record filtering.
- Updated offline service-worker cache to include new model and migration modules.


## v0.5.0 — Batch 2: Stores + Resources

- Upgraded schema from v3 to v5 with non-destructive migration of existing stores/resources.
- Added hierarchical reusable storage locations for lockers, bins, and cabinets while preserving legacy location text.
- Added permanent inventory transactions for restock, consume, adjust, transfer, and maintenance-use events.
- Added inventory status states: OK, LOW, REORDER, MISSING, EXPIRED.
- Added maintenance-demand analysis against spares on board, including optional `part-id:quantity` task requirements.
- Added reorder review combining minimum stock, expiry, and upcoming maintenance demand.
- Added resource transactions with source, confidence, timestamps, duration represented, and optional raw readings.
- Added tank records with usable capacity, reserve, current quantity, provenance, and irregular calibration tables.
- Added calibrated tank-reading workflow and aggregate resource quantities derived from linked tanks.
- Added historical consumption-rate calculation from explicitly duration-scoped resource transactions.
- Added whole-vessel vs per-person daily rate basis and entered vs historical planning-rate selection.
- Added fuel RPM → speed → burn curves, planning RPM, interpolation, and best-range calculation support.
- Added practical provision records with serving endurance, crew normalization, storage location, refrigeration flag, and expiry.
- Updated Bridge, readiness, Reports, search, and Record Inspector integration for Batch 2 data.
- Extended smoke tests for schema migration, storage cycle protection, stock transactions, tank aggregation, calibration, fuel curves, historical rates, and provisions.

## v0.7.0 — Batch 3: POWERWATCH + Voyage Planner

- Upgraded schema from v5 to v7 with non-destructive migration of existing energy and voyage records.
- Added explicit electrical storage-bank records with capacity, SOC, reserve, chemistry, and notes.
- Migrated legacy aggregate energy state into a default house-bank model when needed.
- Added reusable energy operating profiles: underway, motoring, anchor, overnight, conservation, emergency, and custom.
- Added per-profile load and generation overrides while preserving baseline equipment values.
- Added profile-aware POWERWATCH projections and active-profile selection.
- Added staged load-shedding analysis that removes lower-priority loads first and recalculates net energy/endurance after each step.
- Expanded electrical load priorities to essential, operational, comfort, and optional.
- Added deeper generation-source records with source type and optional rated power.
- Added ordered route waypoint records linked to voyages.
- Added great-circle route-leg and total-route distance calculations.
- Added entered-vs-route-derived passage-distance selection.
- Added local GPX route import/export with no cloud or mapping dependency.
- Added voyage scenarios linked to a passage and energy profile.
- Added scenario controls for speed, motor hours, fuel RPM, water-use scaling, and provision-use scaling.
- Added coupled scenario analysis for fuel, water, electrical reserve, provisions, duration, and overall status.
- Added scenario matrix and route-leg table to the Voyage workspace.
- Expanded Passage Plan and Energy Budget reports with route, scenario, storage-bank, and active-profile information.
- Updated readiness calculations to respect route-derived distance and the active energy profile when available.
- Extended smoke tests for v5→v7 migration, storage banks, energy profiles, load shedding, route distance, GPX round-trip, and coupled passage scenarios.


## v0.9.0 — Batch 4: Departure Readiness + Bridge / Watchkeeping

- Upgraded schema from v7 to v9 with non-destructive migration of voyage, energy, stores, maintenance, log, and findings records.
- Added configurable freshness thresholds for weather, position, resources, and condition measurements.
- Added position source / timestamp provenance and explicit stale-data handling.
- Expanded Departure Readiness to dependency-aware Vessel, Propulsion, Steering, Rig, Electrical, Safety, Communications, Crew, Fuel, Water, Provisions, Power, Documents, Spares, Maintenance, Weather, and Emergency Equipment categories.
- Added PASS / REVIEW / HOLD disposition while retaining separate PASS / WATCH / FAIL / UNKNOWN category states.
- Added immutable-style departure baseline snapshots that preserve the readiness result and supporting vessel data as known at the decision point.
- Added explicit Begin Passage and Record Arrival lifecycle actions with departure/arrival log records.
- Reworked Bridge into contextual In Port, At Anchor, and Underway operating views.
- Added watch schedules, active watches, structured end-of-watch handoffs, incoming-watch acknowledgement, and watch history.
- Added watch and handoff records to Logbook and Watch reports.
- Added stale-weather behavior that resolves to UNKNOWN rather than silently passing readiness.
- Preserved maintenance history, handoffs, and departure baselines as historical records in the inspector.
- Extended smoke and integrity tests for v7→v9 migration, baselines, watch lifecycle, freshness, action handlers, and PWA assets.
