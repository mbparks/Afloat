# FIELD INSTRUMENT BUILD PROMPT: AFLOAT

Build a complete browser-based Field Instrument called **AFLOAT**.

## AFLOAT — Vessel Operations, Passage Planning & Maintenance Workbench

AFLOAT is a local-first vessel operations workbench for sailors, liveaboards, passagemakers, expedition vessels, and long-range motor cruisers.

Its purpose is to bring the major operational functions of an ocean-going vessel into one coherent application:

**VESSEL → PLAN → DEPART → OPERATE → MONITOR → MAINTAIN → ARRIVE → LEARN**

AFLOAT should help a skipper answer:

- What is the current state of the vessel?
- Are we ready to depart?
- Can this vessel and crew reasonably complete the intended passage?
- What are our limiting resources?
- What maintenance is due?
- What equipment is degraded?
- What spare parts do we have aboard?
- What weather conditions matter to this vessel?
- How long will fuel, water, food, energy, and other consumables last?
- What should the current watch know?
- What happened during the voyage?
- What did we learn from this anchorage, port, repair, or passage?
- What could currently prevent the vessel from completing its mission?

The core operating philosophy is:

**OBSERVE → ASSESS → DECIDE → ACT → LOG → LEARN**

AFLOAT should feel like a combination of:

- ship's logbook
- engineering notebook
- passage-planning desk
- maintenance system
- vessel inventory
- watchkeeping station
- energy-management console
- cruising guide
- readiness-review instrument

It should not feel like a generic yacht-management SaaS dashboard.

The interface should feel like a serious working instrument aboard a vessel.

---

# 1. IMPORTANT SAFETY BOUNDARIES

AFLOAT is a decision-support and recordkeeping instrument.

It must **not** present itself as a replacement for:

- certified navigation equipment
- official nautical charts
- radar
- AIS
- EPIRBs
- GMDSS equipment
- certified weather-routing systems
- COLREGS knowledge
- professional medical advice
- official customs or immigration guidance
- manufacturer maintenance documentation
- skipper judgment

Do not present calculated results as guarantees of safety.

Avoid labels such as:

- SAFE
- UNSAFE
- GUARANTEED
- APPROVED TO DEPART

Prefer:

- PASS
- WATCH
- FAIL
- REVIEW
- HOLD
- INCOMPLETE
- UNKNOWN

Departure readiness must be a structured review of known conditions, not an automated declaration that a voyage is safe.

Clearly identify assumptions, missing information, stale information, and uncertain information.

---

# 2. LOCAL-FIRST ARCHITECTURE

AFLOAT must be designed primarily for use aboard vessels with unreliable or nonexistent internet access.

Assume:

> The vessel may have no usable internet connection for the next 30 days.

The application must remain useful without cloud access.

Requirements:

- local-first
- offline-capable
- installable PWA
- no mandatory account
- no mandatory cloud service
- no telemetry
- no advertising
- no remote analytics
- no tracking
- no dependency on an always-connected API
- no destructive behavior if connectivity disappears

Use IndexedDB or an equivalent browser-local database for primary storage.

Manual entry must always remain a first-class workflow even when sensor integration exists.

---

# 3. APPLICATION STRUCTURE

AFLOAT should be one application with multiple tightly integrated workspaces sharing a common data model.

Primary navigation:

- BRIDGE
- VOYAGE
- ANCHOR
- VESSEL
- RESOURCES
- STORES
- PROCEDURES
- PORTS
- LOGBOOK
- FINDINGS
- REPORTS
- SETTINGS

Avoid creating a collection of disconnected mini-applications.

All modules should operate on the same vessel, voyage, equipment, resource, location, evidence, and log records.

---

# 4. SHARED DATA MODEL

Create a coherent common data model around objects such as:

- Vessel
- Voyage
- Route
- Waypoint
- Location
- Port
- Anchorage
- Watch
- LogEntry
- WeatherForecast
- WeatherObservation
- System
- Equipment
- Component
- MaintenanceTask
- Inspection
- Measurement
- Resource
- Tank
- InventoryItem
- SparePart
- Provision
- Document
- Procedure
- Checklist
- Finding
- Action
- Assumption
- Evidence
- Attachment
- CrewMember
- SensorSource
- DataSource

Relationships between objects are important.

Example:

An alternator belt:

- belongs to propulsion
- has an inspection interval
- has a maintenance interval
- has a spare part aboard
- may generate a finding
- may affect departure readiness
- has inspection evidence
- has maintenance history
- may have an associated failure procedure

Do not duplicate the same facts independently across modules.

---

# 5. BRIDGE WORKSPACE

BRIDGE is the current operational overview.

It should answer:

> What matters right now?

Display a concise current-state dashboard containing items such as:

## Voyage

- active voyage
- departure
- destination
- current position
- current course
- current speed
- distance traveled
- distance remaining
- ETA
- elapsed time

## Environment

- wind
- gusts
- direction
- sea state
- barometric pressure
- pressure trend
- temperature
- forecast concerns

## Watch

- current watch
- watch start/end
- watchkeeper
- next watch
- unresolved handoff items

## Vessel state

Show status summaries for:

- propulsion
- electrical
- steering
- rig
- plumbing
- navigation electronics
- communications
- safety equipment
- tender

## Resources

Show endurance for:

- fuel
- water
- battery
- propane
- provisions
- other critical consumables

## Attention items

Surface:

- overdue maintenance
- critical findings
- low-stock spare parts
- document expiry issues
- weather limit exceedances
- abnormal measurements
- watch handoff notes
- low resource margins

The Bridge should not become cluttered.

Use progressive disclosure.

---

# 6. VOYAGE WORKSPACE

VOYAGE is the passage planning and execution workbench.

Workflow:

**DESTINATION → ROUTE → CONDITIONS → ENDURANCE → ALTERNATES → RISK → READINESS → DEPARTURE**

Support:

- origin
- destination
- passage name
- estimated route distance
- departure window
- expected vessel speed
- expected duration
- crew
- alternate destinations
- bailout ports
- fuel planning
- water planning
- power planning
- provision planning
- weather assessment
- daylight considerations
- vessel limitations
- open maintenance issues
- required documents
- unresolved findings

Allow comparison of multiple passage scenarios.

Examples:

- conservative
- normal
- fast
- motor-heavy
- low-wind
- energy-conservation
- water-conservation

---

# 7. DEPARTURE READINESS

Departure Readiness should be a signature AFLOAT feature.

Evaluate categories such as:

- vessel
- propulsion
- rig
- steering
- electrical
- safety
- crew
- fuel
- water
- provisions
- power
- communications
- weather
- documents
- spare parts
- maintenance
- emergency equipment

Show status:

- PASS
- WATCH
- FAIL
- REVIEW
- UNKNOWN

Example:

```
DEPARTURE READINESS

VESSEL             PASS
CREW               PASS
FUEL               PASS
WATER              WATCH
WEATHER            WATCH
SAFETY             FAIL
DOCUMENTS          PASS

OPEN ITEMS

HIGH
EPIRB battery will expire during planned voyage window.

MEDIUM
Starboard lower shroud inspection overdue.

MEDIUM
Water endurance margin only 1.7 days.

LOW
Preferred stock is three oil filters; only two aboard.

OVERALL
HOLD — unresolved high-priority item.

```

Do not collapse all readiness into a meaningless percentage.

A percentage may be shown secondarily, but findings must remain visible and understandable.

---

# 8. WEATHER WORKBENCH

Weather should be a reasoning and comparison tool rather than merely a forecast viewer.

Support manually entered or imported forecasts from multiple sources.

Possible sources:

- GRIB-derived data
- NOAA marine forecast
- national meteorological services
- NAVTEX
- weatherfax interpretation
- PredictWind export
- manual observations
- barometer observations
- visual sea observations

Allow comparison between forecast models or sources.

Fields may include:

- timestamp
- forecast time
- wind speed
- gust speed
- direction
- wave height
- wave period
- wave direction
- pressure
- precipitation
- visibility
- confidence
- source

Allow vessel-specific limits such as:

- preferred maximum sustained wind
- preferred maximum gust
- preferred maximum significant wave height
- minimum wave period
- maximum crosswind for docking
- maximum close-hauled duration
- preferred arrival conditions

Flag when forecast values exceed user-defined preferences.

Example:

> WATCH — ECMWF exceeds preferred sea-state limit during arrival window.

Never state that weather is safe.

---

# 9. ROUTE AND PASSAGE PROGRESS

AFLOAT is not a certified chartplotter.

However, allow route and progress data to be represented.

Support:

- manual waypoint entry
- GPX import/export
- route distance
- legs
- bearings
- progress
- distance remaining
- ETA calculations
- average speed
- required speed
- historical speed
- waypoint notes

When live GPS is available, optionally update position.

Clearly identify position source:

- manual
- browser geolocation
- GPS integration
- Signal K
- NMEA
- imported log

---

# 10. WATCHKEEPING

Create a structured WATCH system.

Each watch may record:

- watchkeeper
- time started
- time ended
- position
- course
- speed
- wind
- sea
- pressure
- traffic
- sails
- engine state
- power state
- vessel observations
- weather changes
- maintenance observations
- safety concerns
- notes

At the end of each watch create a WATCH HANDOFF.

Highlight:

- changing conditions
- unresolved observations
- traffic concerns
- weather trends
- equipment anomalies
- upcoming waypoints
- planned sail changes
- maintenance concerns

Allow the incoming watchkeeper to acknowledge handoff.

---

# 11. ANCHOR WORKSPACE

Combine anchoring planning, ground tackle, anchor-watch observations, and anchorage history.

Workflow:

**ANCHORAGE → CONDITIONS → DEPTH → TIDE → GROUND TACKLE → SCOPE → SWING → WATCH → EXPERIENCE**

Support:

- anchorage name
- coordinates
- charted depth
- measured depth
- tidal range
- bottom type
- current
- forecast wind
- available swing room
- nearby hazards
- selected anchor
- chain length
- rope length
- rode diameter
- selected scope
- calculated swing radius
- safety margin

Allow calculation of required rode based on:

- depth
- bow height
- tidal rise
- desired scope

Record:

- anchor-drop position
- vessel positions
- anchor-watch radius
- observed dragging
- anchor resets
- wind changes
- bottom holding
- lessons learned

Anchor Watch must supplement rather than replace navigation alarms.

---

# 12. ANCHORAGE KNOWLEDGE

Each anchorage should become part of the vessel's accumulated knowledge.

Store:

- approach notes
- hazards
- night approach preference
- depth
- bottom
- holding quality
- swell exposure
- wind protection
- current
- shore access
- dinghy landing
- fuel availability
- water
- groceries
- laundry
- chandlery
- repair services
- medical services
- Wi-Fi/cellular notes
- customs
- local contacts
- previous visits
- photos
- attachments
- experience notes

This should become the owner's personal cruising guide over time.

---

# 13. VESSEL WORKSPACE

VESSEL represents the vessel as a system-of-systems.

Example hierarchy:

```
VESSEL

Propulsion
  Engine
  Transmission
  Fuel
  Cooling
  Exhaust
  Shaft / saildrive
  Propeller

Electrical
  House battery
  Start battery
  Alternator
  Solar
  Wind
  Hydro
  Generator
  Shore power
  Inverter
  DC distribution
  AC distribution

Rig
  Mast
  Boom
  Standing rigging
  Running rigging
  Sails

Steering

Plumbing
  Fresh water
  Black water
  Grey water
  Pumps
  Watermaker

Navigation

Communications

Safety

Tender

Hull

Deck

Ground tackle

```

Allow arbitrary custom systems.

---

# 14. EQUIPMENT RECORDS

Each equipment/component record should support:

- name
- parent system
- manufacturer
- model
- serial number
- installation date
- purchase date
- commissioning date
- hours
- cycles
- service interval
- inspection interval
- expected life
- current condition
- status
- criticality
- failure consequence
- location
- notes
- photographs
- manuals
- datasheets
- spare parts
- maintenance history
- measurements
- findings
- procedures
- evidence

Support QR codes or printable labels that reference equipment records.

---

# 15. MAINTENANCE

Support:

- time-based maintenance
- engine-hour maintenance
- cycle-based maintenance
- calendar maintenance
- seasonal maintenance
- condition-based maintenance
- one-time corrective actions

Statuses:

- Upcoming
- Due
- Overdue
- Deferred
- Completed
- Not Applicable

Tasks should support:

- equipment
- procedure
- required tools
- required parts
- required consumables
- estimated duration
- notes
- evidence
- completion record
- person completing task
- next due value

---

# 16. CONDITION MONITORING

Allow manual and future automated recording of measurements.

Examples:

Engine:

- coolant temperature
- oil pressure
- RPM
- exhaust temperature
- vibration
- alternator temperature
- fuel pressure

Electrical:

- battery voltage
- current
- state of charge
- alternator output
- solar output
- inverter temperature

Rig:

- visual inspection
- corrosion
- cracks
- wire condition
- terminal condition
- tension readings

Plumbing:

- pump cycle rate
- bilge pump events
- watermaker production
- freshwater pressure

Show:

- current value
- expected range
- threshold
- historical trend
- last measurement
- finding status

Do not imply engineering-grade precision from low-quality sensor data.

---

# 17. RESOURCE WORKSPACE

Combine fuel, water, power, provisions, and other consumables into one endurance model.

For every resource track:

- total capacity
- usable capacity
- current quantity
- reserve
- consumption rate
- production rate
- uncertainty
- historical consumption
- estimated endurance
- units

Examples:

- diesel
- gasoline
- potable water
- emergency water
- propane
- battery energy
- generator fuel
- food
- medications
- engine oil
- hydraulic fluid
- toilet chemicals

The primary question should be:

> How long will this resource last?

---

# 18. TANKAGE

Create tank records containing:

- resource
- capacity
- usable capacity
- current amount
- calibration table
- sensor source
- manual reading
- fill history
- consumption history
- reserve level

Support tanks with irregular geometry through calibration tables.

Allow manual sounding or gauge entry.

---

# 19. WATER ENDURANCE

Calculate:

- gallons/liters aboard
- emergency reserve
- historical consumption per person/day
- crew count
- watermaker production
- current endurance
- conservation endurance
- passage margin

Example:

```
Fresh water        92 gal
Emergency reserve  20 gal
Usable             72 gal
Historical use     5.8 gal/day
Crew               3

Estimated endurance 12.4 days
Passage duration    10.7 days
Margin               1.7 days

```

---

# 20. FUEL AND RANGE

Support:

- fuel capacity
- usable fuel
- reserve
- engine consumption
- generator consumption
- speed
- engine RPM
- historical burn

Create a fuel curve:

RPM → speed → fuel burn

Allow analysis such as:

- hours of motoring
- nautical-mile range
- reserve at destination
- best-range operating point

Clearly label estimates.

---

# 21. ENERGY / POWERWATCH

Create a detailed energy workbench inside RESOURCES.

Model:

**GENERATION → STORAGE → LOADS → ENDURANCE**

Generation sources:

- solar
- alternator
- generator
- shore power
- wind
- hydro
- other

Storage:

- house bank
- start bank
- emergency bank
- individual battery banks

Loads:

- navigation
- autopilot
- instruments
- refrigeration
- freezer
- watermaker
- Starlink
- radios
- lighting
- cooking
- pumps
- entertainment
- user-defined loads

For each load:

- voltage
- current
- power
- duty cycle
- hours/day
- priority
- operating state

Support scenarios:

- underway
- at anchor
- motoring
- overnight
- conservation
- emergency
- custom

Calculate:

- daily consumption
- daily generation
- deficit/surplus
- battery endurance
- reserve
- projected state of charge

---

# 22. STORES WORKSPACE

Stores should manage:

- spare parts
- consumables
- tools
- provisions
- emergency supplies
- medical inventory
- repair materials

Each item should support:

- name
- category
- quantity
- unit
- minimum quantity
- desired quantity
- storage location
- part number
- manufacturer
- supplier
- associated vessel system
- associated equipment
- criticality
- expiration date
- cost
- notes
- photo

Statuses:

- OK
- LOW
- REORDER
- EXPIRED
- MISSING

---

# 23. SPARE-PART RELATIONSHIPS

Inventory items should understand what they support.

Example:

```
RAW WATER IMPELLER

Part number:
129670-42530

Quantity:
2

Supports:
Main engine → Raw-water pump

Criticality:
HIGH

Minimum aboard:
2

Required tools:
10 mm socket
Needle nose pliers
Impeller puller

Associated procedure:
Replace raw-water impeller

```

Maintenance tasks should automatically check whether required parts and consumables are aboard.

---

# 24. PROVISIONS

Provide a practical provision planner.

Track:

- category
- quantity
- servings
- estimated daily use
- storage location
- expiry
- refrigeration requirement

Categories might include:

- drinking water
- canned food
- dry goods
- fresh food
- refrigerated food
- frozen food
- snacks
- emergency food

Estimate days of provisions based on crew and historical consumption.

Keep this practical rather than turning it into a calorie-tracking app.

---

# 25. MEDICAL STORES

Medical functionality should focus on inventory and preparedness rather than diagnosis.

Track:

- item
- quantity
- expiry
- storage location
- instructions/manual references
- replenishment status

Surface expiring items.

Allow attachments such as official manuals or vessel medical procedures.

Do not provide medical diagnoses.

---

# 26. PROCEDURES WORKSPACE

Maintain vessel-specific procedures.

Categories:

## Normal

- departure
- docking
- anchoring
- raising anchor
- reefing
- sail changes
- engine startup
- engine shutdown
- generator startup
- watermaker startup

## Abnormal

- engine overheating
- alternator failure
- steering failure
- low battery
- fouled prop
- pump failure
- watermaker failure
- electronics failure

## Emergency

- man overboard
- fire
- flooding
- grounding
- collision
- dismasting
- abandon ship
- emergency communications

Each procedure can contain:

- purpose
- prerequisites
- warnings
- steps
- equipment locations
- associated systems
- required tools
- required parts
- attachments
- notes

Allow procedures to be converted into live checklists.

---

# 27. CHECKLIST EXECUTION

When a checklist is started:

- create an execution record
- timestamp each completed step
- allow notes
- allow skipped steps with reason
- record who performed it
- preserve the final record

Examples:

- Offshore Departure
- Engine Start
- Anchor Departure
- Heavy Weather Preparation
- Abandon Ship Preparation

---

# 28. PORTS WORKSPACE

Create a personal port and harbor database.

Store:

- port
- country
- coordinates
- arrival approach
- communications
- VHF channels
- customs
- immigration
- harbor master
- marina
- anchorage options
- fuel
- water
- propane
- chandlery
- mechanical services
- electrical services
- sailmaker
- haul-out
- laundry
- groceries
- medical care
- transport
- local notes
- contacts
- photos
- attachments
- visit history

Official requirements should carry:

- source
- source date
- verification date
- confidence
- notes

Make stale regulatory information visible.

---

# 29. SHIP'S PAPERS

Manage vessel documents such as:

- registration
- insurance
- radio license
- passports
- visas
- cruising permits
- safety equipment certificates
- life raft servicing
- EPIRB servicing
- flare expiry
- vessel inspection
- crew qualifications

Track:

- issue date
- expiration date
- country
- document number
- renewal notes
- attachment
- verification source

Display upcoming expirations.

Allow voyage readiness checks to identify documents likely to expire during the planned passage.

---

# 30. LOGBOOK

LOGBOOK is the permanent operational history.

Types:

- routine
- navigation
- weather
- maintenance
- inspection
- watch
- anchoring
- port
- incident
- repair
- resource
- observation
- lesson learned

Each entry can contain:

- date/time
- vessel
- voyage
- location
- coordinates
- author
- category
- notes
- related equipment
- related findings
- photos
- attachments
- measurements

Create a fast log-entry mode suitable for use underway.

---

# 31. LESSONS LEARNED

Allow any voyage, port, anchorage, incident, failure, or maintenance task to produce a lesson.

Structure:

**EVENT → OBSERVATION → DECISION → RESULT → LESSON**

Lessons should remain searchable and link back to supporting evidence.

Examples:

- anchorage holding behavior
- actual fuel burn
- reefing behavior
- water usage
- equipment reliability
- maintenance difficulty
- useful spare parts
- poor spare choices
- arrival timing
- weather-model performance

---

# 32. HISTORICAL LEARNING

AFLOAT should increasingly use the vessel's own historical data.

Examples:

> Historical engine burn at 2200 RPM: 0.68 gal/hr.

> Historical offshore water usage: 5.4 gal/day.

> Refrigerator consumption increases approximately 18% in hot cabin conditions.

> Alternator belt typically requires adjustment after approximately 140 engine hours.

These should be presented as historical observations, not guaranteed predictions.

Show sample size and data date range where appropriate.

---

# 33. FINDINGS SYSTEM

Create a centralized FINDINGS register.

A finding can originate from:

- maintenance
- inspection
- voyage planning
- weather
- resources
- inventory
- documents
- sensor observations
- anchor operation
- manual entry

Fields:

- title
- description
- severity
- confidence
- status
- source
- affected system
- affected voyage
- evidence
- recommended action
- owner
- due date

Severity:

- INFO
- LOW
- MEDIUM
- HIGH
- CRITICAL

Confidence:

- LOW
- MEDIUM
- HIGH

Status:

- OPEN
- REVIEWED
- DEFERRED
- RESOLVED
- ACCEPTED

---

# 34. ASSUMPTIONS REGISTER

Calculations should expose assumptions.

Examples:

- expected passage speed
- expected fuel burn
- water consumption
- solar production
- crew size
- motor hours
- weather limits
- battery usable capacity

Store:

- assumption
- value
- units
- source
- confidence
- date
- notes

Allow users to identify assumptions that materially affect readiness.

---

# 35. EVIDENCE

Support evidence throughout the application.

Evidence can include:

- photographs
- documents
- screenshots
- measurements
- maintenance records
- receipts
- inspection notes
- sensor logs
- weather forecasts
- manuals

Every major conclusion should be traceable back to its inputs.

---

# 36. REPORTS

Provide useful printable/exportable reports.

Reports should include:

- Departure Readiness Report
- Passage Plan
- Voyage Summary
- Vessel Health Report
- Maintenance Due Report
- Maintenance History
- Resource Endurance Report
- Energy Budget
- Spare Parts Inventory
- Port Arrival Brief
- Anchorage Report
- Watch Log
- Ship's Papers Expiration Report
- Findings Register
- Incident Report
- Vessel Overview

Support PDF generation.

Reports must be readable in light and dark UI modes.

---

# 37. DATA IMPORT / EXPORT

Support:

- complete vessel backup
- restore
- JSON import/export
- CSV import/export where appropriate
- GPX route import/export
- attachment export
- report export

A full backup should be downloadable as a portable archive such as:

```
AFLOAT-VESSEL-BACKUP.zip

manifest.json
vessel.json
voyages/
logs/
maintenance/
inventory/
ports/
anchorages/
weather/
documents/
photos/
attachments/

```

Backups must be user-controlled.

Do not require proprietary cloud storage.

---

# 38. AUTOSAVE

Use automatic local saving.

Provide a visible status indicator:

- UNSAVED
- SAVING
- SAVED
- ERROR

Do not require the user to remember to click Save.

---

# 39. FRESH START / SAMPLE DATA

Provide:

- Load Demo Vessel
- Fresh Start
- Clear Sample Data

Demo data should be realistic and sufficiently complex to demonstrate the full application.

Fresh Start must create a genuinely blank vessel.

Sample records must never remain hidden after clearing demo data.

---

# 40. OPERATING MODES

Provide two interface modes.

## CRUISING MODE

Designed for day-to-day use.

Prioritize:

- Bridge
- current voyage
- watch
- weather
- resource endurance
- maintenance due
- important findings
- logbook

Hide unnecessary configuration details.

## ENGINEERING MODE

Expose:

- assumptions
- calculation methods
- thresholds
- vessel topology
- detailed system information
- energy models
- maintenance rules
- calibration
- sensor sources
- evidence
- data provenance

Switching modes must actually change interface complexity.

---

# 41. UI / UX PHILOSOPHY

The application should feel like a serious marine field instrument.

Characteristics:

- information-dense but calm
- large legible values
- strong hierarchy
- useful whitespace
- good contrast
- restrained color
- clear status indicators
- minimal decorative graphics
- no glossy yacht-marketing aesthetic
- no generic corporate SaaS style

Imagine:

**ship's bridge instrument + engineering notebook + expedition logbook**

Use nautical influence subtly.

Avoid fake wood, brass, ropes, compass roses, and novelty maritime styling.

---

# 42. RESPONSIVE DESIGN

Optimize for:

- laptop at navigation station
- tablet in cockpit
- phone for quick log entry
- desktop during maintenance

Provide collapsible navigation.

Touch targets must be usable aboard a moving vessel.

Avoid hover-only controls.

---

# 43. DARK / NIGHT MODE

Night mode is essential.

Provide:

- Light
- Dark
- Night / red-preserving mode if practical

Night mode should minimize glare while preserving readability.

Do not rely exclusively on color to communicate status.

---

# 44. SEARCH

Create global search across:

- vessel systems
- equipment
- maintenance
- inventory
- logbook
- voyages
- anchorages
- ports
- findings
- procedures
- documents

Example search:

`impeller`

should locate:

- raw-water pump
- spare impellers
- maintenance procedure
- previous replacement log
- open finding
- associated manual

---

# 45. TIMELINE

Create a vessel timeline showing:

- voyages
- repairs
- inspections
- equipment installations
- failures
- maintenance
- incidents
- port visits
- major findings

The timeline should help reconstruct vessel history.

---

# 46. FUTURE SENSOR INTEGRATION

Design the architecture so optional integrations can be added later.

Potential integrations:

- Signal K
- NMEA 0183
- NMEA 2000
- GPS
- AIS
- battery monitors
- tank sensors
- engine data
- weather instruments
- barometer
- bilge sensors
- temperature sensors

Do not make any integration mandatory.

Manual entry must remain fully functional.

---

# 47. SIGNAL K

Treat Signal K as the preferred future integration layer where appropriate.

Architect an adapter that can map external vessel data to AFLOAT's internal data model.

Potential data:

- navigation position
- speed
- heading
- wind
- depth
- tank levels
- battery state
- engine parameters
- temperature
- pressure

Allow users to choose what is imported.

Do not silently overwrite manual values.

---

# 48. DATA PROVENANCE

Every value that may originate from multiple sources should identify its source.

Examples:

```
Position
Source: Signal K
Updated: 14 sec ago

Fuel level
Source: Manual sounding
Updated: 3 hr ago

Water level
Source: Tank sensor
Updated: 40 sec ago

```

Flag stale data.

---

# 49. OPTIONAL ONBOARD SERVICE

Because AFLOAT is no longer restricted to a single HTML file, structure the project so a small optional onboard service can later handle:

- NMEA
- serial devices
- Signal K
- file imports
- sensor gateways
- local network APIs

The primary application must remain a browser-based PWA.

Keep frontend, calculation engine, storage, and integration adapters cleanly separated.

---

# 50. TECHNOLOGY

Choose a maintainable modern stack suitable for an offline PWA.

Prefer:

- TypeScript
- component-based UI framework
- IndexedDB
- service worker
- modular calculation library
- schema validation
- unit-tested calculation functions

Avoid unnecessary backend dependence.

The application should be deployable as static web assets for normal use.

---

# 51. UNITS

Support both:

## Marine / US customary

- nautical miles
- knots
- gallons
- Fahrenheit
- feet
- PSI

## Metric

- nautical miles
- knots
- liters
- Celsius
- meters
- kPa/bar

Individual values should retain explicit unit metadata.

Avoid ambiguous unit conversion.

---

# 52. CALCULATION TRANSPARENCY

Calculations should show the formula and source inputs when requested.

Example:

```
Water endurance

Usable water = 72 gal
Historical consumption = 5.8 gal/day

Endurance = 72 / 5.8
          = 12.4 days

```

Do not hide important calculations behind opaque scores.

---

# 53. VERSIONING

Display the application version prominently in the UI.

Example:

**AFLOAT v0.1.0**

Use semantic versioning.

Maintain a changelog.

---

# 54. ACCESSIBILITY

Support:

- keyboard navigation
- large text
- high contrast
- color-blind-safe status indicators
- screen-reader-friendly labels
- reduced-motion preferences

Status must use text/icons in addition to color.

---

# 55. DATA PRIVACY

AFLOAT contains highly sensitive vessel and travel information.

Therefore:

- no telemetry
- no analytics
- no background uploading
- no account required
- no external sharing without explicit action
- no advertising SDKs
- no third-party tracking scripts

Document clearly where data is stored.

---

# 56. DEMO VESSEL

Create a realistic fictional demo vessel.

Example:

**SV Meridian**

Type:
42 ft offshore cruising sailboat

Crew:
3

Systems:

- diesel auxiliary engine
- 600 Ah LiFePO₄ house bank
- solar
- alternator
- generator
- watermaker
- propane
- AIS
- radar
- autopilot
- NMEA network
- dinghy/outboard

Demo scenario:

**Bermuda → Horta**

Include:

- voyage
- weather
- maintenance
- resources
- inventory
- open findings
- watch entries
- port information
- anchorage history

Make the demo rich enough for every major screen to contain meaningful data.

---

# 57. FIRST LAUNCH

On first launch show:

**AFLOAT**

Vessel Operations, Passage Planning & Maintenance Workbench

Actions:

- Create Vessel
- Load Demo Vessel
- Import Backup

Do not force a tutorial.

Allow optional contextual help.

---

# 58. INITIAL DASHBOARD

Once a vessel exists, default to BRIDGE.

If not underway, Bridge should adapt.

Examples:

## In Port

Show:

- vessel health
- maintenance priorities
- inventory shortages
- documentation expirations
- planned voyage
- upcoming work

## At Anchor

Show:

- anchor state
- weather
- resource endurance
- battery state
- maintenance
- logbook

## Underway

Show:

- position
- course
- speed
- weather
- active watch
- passage progress
- vessel state
- resource margins

Context should change the dashboard.

---

# 59. DESIGN FOR REAL FAILURES

AFLOAT should remain understandable when things go wrong.

Examples:

- database write failure
- stale sensor input
- lost connection
- malformed import
- incomplete route
- missing tank calibration
- undefined fuel rate
- expired weather data

Never silently substitute zero for missing information.

Use:

**UNKNOWN**

rather than misleading calculations.

---

# 60. DEVELOPMENT PRIORITY

Do not attempt every integration in the first version.

Build a strong local-first foundation first.

Recommended development order:

## Phase 1 — Core Vessel

- application shell
- IndexedDB
- vessel creation
- navigation
- logbook
- systems/equipment
- findings
- attachments
- import/export

## Phase 2 — Vessel Operations

- maintenance
- inspections
- measurements
- stores
- spare parts
- procedures

## Phase 3 — Resources

- tanks
- fuel
- water
- provisions
- energy model
- endurance calculations

## Phase 4 — Voyage

- passage planning
- scenarios
- weather comparison
- route
- readiness

## Phase 5 — Active Operations

- Bridge
- watchkeeping
- voyage execution
- handoffs

## Phase 6 — Anchor and Ports

- anchoring workbench
- anchorage history
- port database
- ship's papers

## Phase 7 — Integration

- GPS
- GPX
- Signal K
- NMEA
- live measurements

Build each phase so the application remains usable before the next phase exists.

---

# 61. FOUNDATIONAL PRODUCT RULES

AFLOAT should follow these rules:

1. Local-first.
2. Offline-capable.
3. No mandatory cloud.
4. No telemetry.
5. Manual entry always works.
6. Autosave everything.
7. Make data portable.
8. Keep calculations transparent.
9. Surface uncertainty.
10. Preserve evidence.
11. Preserve history.
12. Prefer traceability over automation.
13. Avoid false precision.
14. Avoid safety guarantees.
15. Let the skipper define limits.
16. Treat missing data as unknown.
17. Make the vessel—not the software—the organizing principle.
18. Build for ten years of accumulated operational history.
19. Make the application useful aboard a vessel with no internet.
20. Design around real decisions rather than database administration.

---

# 62. CORE PRINCIPLE

The application should ultimately create a persistent operational model of the vessel.

AFLOAT should gradually answer questions such as:

> Where are we?

> Where are we going?

> Can we get there with reasonable margin?

> What assumptions does that depend on?

> What is the vessel's current condition?

> What needs attention?

> What resources are limiting us?

> What parts do we have aboard?

> What maintenance is approaching?

> What happened previously under similar conditions?

> What did we learn?

The mature concept is:

**VESSEL + VOYAGE + CONDITIONS + RESOURCES + EXPERIENCE = OPERATIONAL UNDERSTANDING**

AFLOAT should not merely store information about a vessel.

It should turn that information into an understandable, traceable picture of the vessel's operational state.

The guiding principle is:

# The vessel becomes knowledge. Experience becomes seamanship.