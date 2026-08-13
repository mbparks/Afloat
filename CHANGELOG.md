# Changelog

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
