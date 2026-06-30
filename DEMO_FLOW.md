# Soliton — Demo Script

**Duration:** 25-30 minutes (expandable to 45 with deep dives)
**Audience:** Municipal engineers, UP Jal Nigam officials, AMRUT 2.0 reviewers, consultants
**Setup:** Laptop with browser open to `http://localhost:5173` (or served from `dist/`)

---

## Act 1 — The Hook (2 min)

### What to show
Open Soliton in the browser. Ayodhya network loads automatically with solved results.

### What to say
> "This is Soliton — a hydraulic network design tool that runs entirely in your browser. No installation, no cloud account, no per-seat licence. It runs the same EPANET 2.2 engine that powers Bentley WaterGEMS — but compiled to WebAssembly so it works offline on any laptop."
>
> "WaterGEMS costs ₹1.7L–8.7L per year per seat. InfoWater Pro: ₹9.6L per year. Soliton: zero. And it does what municipal engineers actually need."

---

## Act 2 — The Ayodhya Network (2 min)

### What to do
1. Network is pre-loaded with Ayodhya demo (auto-loads on startup)
2. If not, click **Demo ▾** → select **"24x7 in 11 wards"**
3. Map shows the network — WTP (blue), two OHTs (purple), ~35 junctions, ~50 pipes

### What to say
> "This is a realistic model of Ayodhya's AMRUT 2.0 water distribution network. The Saryu River source augmentation with a 100 MLD WTP, two overhead tanks, and a distribution grid covering 11 wards."
>
> "Green nodes = pressure above 17m CPHEEO floor. Red nodes = deficient. You can see the central area is well-served but the periphery struggles."

### What to point out
- WTP in the north (blue reservoir icon)
- OHT1 and OHT2 (purple tank icons)
- Green/red color coding on junctions
- Status badge in top bar: `P: 14/33 (42%) · V: 22/50 · EPS`

---

## Act 3 — Interactive Analysis (3 min)

### What to do
1. Click any **green junction** → right panel shows properties + results
2. Show **pressure, head, demand** values
3. Scroll down → show the **sparkline** (mini time series chart)
4. Click **"View Time Series"** button → full modal opens
5. Show the **CPHEEO threshold line** (red dashed at 17m)
6. Switch tabs: Pressure → Head → Demand
7. Show **stats bar**: Min, Avg, Max with timestamps
8. Click **PNG** export button

### What to say
> "Click any node and you get full results. But the real power is the time series chart. This shows pressure over the full 24-hour simulation."
>
> "That red dashed line is the CPHEEO 17m minimum. You can see exactly when this node drops below standard — 7 AM during morning peak. The stats tell you: minimum was 14.2m at 07:00."
>
> "Export as PNG for your reports. Switch between pressure, head, demand — all interactive."

### Then show a pipe
1. Click a **pipe** → show flow, velocity, headloss
2. Show pipe sparkline (orange color)
3. Click "View Time Series" → flow variation over 24 hours

---

## Act 4 — The Results Dashboard (2 min)

### What to do
1. Click **Analysis ▾** → **Results Dashboard**
2. Dashboard opens with tabs: Nodes, Links, Tanks, NRW
3. Sort by Pressure ascending → worst nodes first
4. Click a row → highlights on map

### What to say
> "The results dashboard gives the complete picture. Sort by pressure — instantly see your most critical zones. Click any row, it highlights on the map."
>
> "Velocity tab shows stagnation risk — pipes with flow below 0.6 m/s. NRW tab scores against the AMRUT 2.0 target of less than 20%."

---

## Act 5 — 24-Hour EPS + Time Slider (2 min)

### What to do
1. Use the **time slider** in top bar to scrub through 24 hours
2. Watch node colors change: 6 AM → red nodes appear, 2 AM → all green

### What to say
> "Scrub through the day. Morning peak — nodes start failing. Evening peak — peripheral zones suffer most. 2 AM — everything green but that's your leakage window: high pressure, no demand."

### If time allows — Tank Traces
1. Results Dashboard → Tanks tab → show OHT1/OHT2 level traces
2. > "Tank drains during peak, fills overnight. If it bottoms out, you need to size larger."

---

## Act 6 — What-If Pipe Shutdown (2 min)

### What to do
1. Select a critical pipe near OHT1
2. In Properties panel → change **Status** to **"Closed"**
3. Click **Compute** → watch affected junctions turn red
4. Revert to Open → Compute again

### What to say
> "Imagine a main break. Close the pipe, recompute — instantly see which zones lose supply. Your maintenance crew knows the impact before they dispatch."

---

## Act 7 — Criticality Analysis (2 min)

### What to do
1. Click **Analysis ▾** → **⚠ Criticality (N-1)**
2. Click **Run Criticality Analysis (50 pipes)**
3. Show progress bar
4. Show results: **Resilience Score**, ranked pipe table with severity tags

### What to say
> "That was one pipe. Criticality analysis tests every pipe automatically. Close each one, solve, compare to baseline. The resilience score tells you what percentage can fail without causing pressure violations."
>
> "Pipes ranked by severity — CRITICAL means multiple nodes drop below standard. This is your pipe replacement priority list."

---

## Act 8 — Fire Flow Analysis (2 min)

### What to do
1. Click **Analysis ▾** → **🔥 Fire Flow Analysis**
2. Set population (e.g., 10,000)
3. Show calculated fire demand: Q = 100√P LPM (CPHEEO)
4. Click **Run Fire Flow Analysis**
5. Show results: adequate/deficient per node

### What to say
> "Fire flow analysis is mandatory for planning approvals. CPHEEO formula: Q equals 100 times square root of population in thousands."
>
> "Each junction tested individually — add fire demand, solve, check residual pressure. Red = can't support fire flow. That's where you need larger mains or hydrant boosters."

---

## Act 9 — DMA Zoning & Isolation (2 min)

### What to do
1. Click **Analysis ▾** → **🗺 DMA / Zones**
2. Click **+ Add Zone** → name it "Central"
3. Click junction nodes to assign (toggle buttons)
4. Add a second zone "Peripheral"
5. Click **Compute Zone Statistics**
6. Show per-zone: demand, inflow, NRW%, boundary pipes
7. Switch to **Isolation tab** → select a pipe → **Analyze Isolation Impact**
8. Show disconnected nodes (or "No nodes disconnected — redundant paths")

### What to say
> "DMAs — District Metered Areas — are how you operationalize 24x7 supply. Define your zones, assign nodes, and instantly see per-zone water balance."
>
> "Isolation analysis: if this valve closes, who loses water? Network has redundant paths? Great. Doesn't? That's your single point of failure."

---

## Act 10 — Water Quality (2 min)

### What to do
1. Click **Settings ▾** (Scenario)
2. Scroll to **Water Quality** section
3. Change type to **"Water Age"**
4. Close panel → **Compute**
5. Explain: "Water age shows how long water sits in pipes — stagnation indicator"

### What to say
> "EPANET's water quality engine runs alongside hydraulics. Water Age tells you which pipes have stagnant water — a chlorine decay and contamination risk."
>
> "You can also run Chemical mode — model chlorine residual decay with bulk and wall coefficients. Or Source Trace — track water from a specific source through the network."

---

## Act 11 — Operational Rules (1 min)

### What to do
1. In Scenario Settings → scroll to **Operational Rules**
2. Click **+ Add Rule**
3. Show: IF Tank OHT1 Level BELOW 2m THEN Pump PU1 OPEN
4. Add second rule: IF Tank OHT1 Level ABOVE 5m THEN Pump PU1 CLOSED

### What to say
> "Operational rules automate pump and valve control during the 24-hour simulation. Tank drops below 2 metres — pump turns on. Tank fills to 5 — pump shuts off. This is how your SCADA logic gets modelled."

---

## Act 12 — Demand Allocation (2 min)

### What to do
1. Click **Analysis ▾** → **📊 Demand Allocation**
2. Show the wizard: upload CSV with zone populations
3. Select **Population-Based** method
4. Show preview: current vs new demand per node
5. Click **Apply** → demands updated

### What to say
> "Real-world demand comes from census data, billing records, or land-use surveys. Upload a CSV with zone populations — Soliton computes per-capita demand using CPHEEO standards and assigns it to the right nodes."
>
> "Three methods: population-based (LPCD), billing-based (with NRW factor), or area-proportional. Preview before you apply — see exactly what changes."

---

## Act 13 — Calibration (2 min)

### What to do
1. Click **Analysis ▾** → **🎯 Calibrate (Field Data)**
2. Upload a CSV: `node_id, measured_pressure` (prepare sample file)
3. Show **scatter plot** — modelled vs measured with 1:1 line
4. Show **stats cards**: RMSE, R², MAE, max error
5. Show **comparison table** sorted by error

### What to say
> "Your model is only as good as its calibration. Upload field pressure measurements — Soliton shows you the scatter plot and statistics."
>
> "R² of 0.85 means good correlation. RMSE of 3.2m means your model is within 3 metres on average. These are the numbers your DPR reviewer wants to see."

---

## Act 14 — GIS Import (1 min)

### What to do
1. Click the **↓ import button** on left toolbar
2. Show the drag-drop dialog
3. Explain: "Drop a GeoJSON file — auto-creates nodes at pipe endpoints, maps attributes"
4. Show attribute mapping UI (if you have a sample GeoJSON)

### What to say
> "Don't want to draw from scratch? Import your existing GIS data. Drop a GeoJSON file — Soliton auto-creates junction nodes, deduplicates by proximity, maps your diameter and roughness columns. Replace or merge into existing network."

---

## Act 15 — DPR Export (2 min)

### What to do
1. Click **Export ▾** → **Generate DPR (PDF)**
2. PDF downloads — open it
3. Walk through the pages:
   - Cover page (branded, project title, network stats)
   - Table of Contents
   - Executive Summary (3 cards: pressure compliance, velocity, NRW)
   - Network Map (captured from MapLibre)
   - Pressure Compliance (full junction table)
   - Velocity Analysis (all pipes with status)
   - Water Balance & NRW (system input vs demand)
   - Node Results Schedule
   - Pipe Schedule (with cost per pipe)
   - Cost Summary (by diameter, by material)
   - CPHEEO Design Criteria reference
   - Deficient Zones with remediation recommendations

### What to say
> "One click — 12-page DPR-ready report. Cover page, table of contents, compliance tables, cost breakdown, design criteria. This goes straight into your tender document."
>
> "Cost summary breaks down by pipe diameter and material — DI, HDPE, PVC. Total estimated cost in lakhs/crores. All from Indian municipal SOR rates."

---

## Act 16 — The Close (2 min)

### What to say
> "Let me summarize what you just saw:
>
> Ten advanced analyses — time series, criticality, fire flow, water quality, DMA zoning, calibration, demand allocation — all running in a browser. No server, no licence.
>
> Every number from EPANET 2.2. Every standard from CPHEEO 2024. DPR-ready PDF export in one click.
>
> Bentley WaterGEMS: ₹1.7 lakh to ₹8.7 lakh per year, per seat. InfoWater Pro: ₹9.6 lakh per year. Soliton: zero.
>
> The same model that validates your design today becomes your digital twin tomorrow. Feed in field sensor readings, compare measured versus modelled, and you have live ground-truth for every zone.
>
> That's what AMRUT 2.0 24x7 design should look like."

---

## Backup Scenarios (if audience asks)

### "Show me a different city"
Click **Demo ▾** → select **Bhubaneswar**, **Ranchi**, or **Bareilly**. Each has pre-built networks with scenarios.

### "Can you import our existing EPANET model?"
Click **View ▾** → **INP Viewer** to show current INP. Or use the import dialog for GeoJSON. INP round-trip works too (parse → modify → export).

### "How accurate is this compared to WaterGEMS?"
> "Identical hydraulic engine — EPANET 2.2. Same solver, same equations, same convergence. The difference is deployment: browser vs desktop. You can export the INP file and run it in WaterGEMS to verify — results will match."

### "What about pumps and valves?"
Press `U` for pump, `V` for valve → click two nodes → set properties → Compute. Show operational rules controlling them during EPS.

### "How do I save my work?"
Auto-saves to browser localStorage. Export as INP for interoperability. Scenario save/load for comparing alternatives. DPR PDF for stakeholders.

### "Can this work offline?"
> "Yes. Once loaded, everything runs in the browser. No API calls, no cloud. Works on a train, works in a field office with no internet."

### "What about large networks?"
> "EPANET 2.2 handles networks with thousands of nodes. The browser WASM engine is as fast as the desktop version. For very large city models (10,000+ nodes), the solver takes a few seconds instead of sub-second."

---

## Pre-Demo Checklist

- [ ] `npm run dev` running (or `dist/` served)
- [ ] Browser open, full screen, no other tabs
- [ ] Dev tools console closed
- [ ] **localStorage cleared** (`localStorage.removeItem('soliton-autosave')`) for clean start
- [ ] Zoom level comfortable on projector/screen
- [ ] If presenting offline: confirm glyphs cached from a prior online load
- [ ] Practice the 16-act flow once — know where each button is
- [ ] Prepare sample CSV files:
  - `field_pressures.csv` (for calibration demo): `node_id,measured_pressure`
  - `zone_populations.csv` (for demand allocation demo): `zone_id,population`
- [ ] Have the Ayodhya network pre-loaded if you want to skip Act 2

---

## Key Numbers to Memorize

| Metric | Value | Context |
|--------|-------|---------|
| CPHEEO pressure floor | 17 m | 24x7 DMA target for Class I/II cities |
| Ayodhya LPCD | 135 | Class I city with sewerage |
| AMRUT NRW target | <20% | Non-revenue water reform target |
| Velocity band | 0.6-2.5 m/s | CPHEEO permissible range |
| Economic velocity | 1.0-1.5 m/s | Optimal for energy + asset life |
| Fire demand formula | Q=100√P LPM | CPHEEO, P in thousands |
| WaterGEMS cost | ₹1.7L–8.7L/yr | Bentley OpenFlows tiers |
| InfoWater Pro cost | ₹9.6L/yr | Autodesk/Innovyze |
| Soliton cost | ₹0 | Browser, offline, no licence |
| Total tests | 191 | All TDD, all passing |

---

## Demo Flow Map (Quick Reference)

```
Act 1:  Hook (zero cost, browser, EPANET)
Act 2:  Load Ayodhya (network on map, green/red nodes)
Act 3:  Interactive Analysis (sparkline + time series chart) ← NEW
Act 4:  Results Dashboard (tables, sort, click-to-select)
Act 5:  24-Hour EPS + Time Slider (day/night variation)
Act 6:  What-If Pipe Shutdown (close pipe, see impact)
Act 7:  Criticality Analysis (N-1 bulk test, resilience score) ← NEW
Act 8:  Fire Flow Analysis (CPHEEO, per-node test) ← NEW
Act 9:  DMA Zoning & Isolation (zones, stats, disconnection) ← NEW
Act 10: Water Quality (age, chlorine, source trace) ← NEW
Act 11: Operational Rules (IF/THEN pump control) ← NEW
Act 12: Demand Allocation (CSV upload, 3 methods) ← NEW
Act 13: Calibration (scatter plot, RMSE, R²) ← NEW
Act 14: GIS Import (GeoJSON drag-drop, attribute mapping) ← NEW
Act 15: DPR Export (12-page branded PDF) ← NEW
Act 16: Close (pricing, digital twin vision)
```
