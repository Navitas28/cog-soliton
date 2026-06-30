# Soliton — Demo Script

**Duration:** 15-20 minutes
**Audience:** Municipal engineers, UP Jal Nigam officials, AMRUT 2.0 reviewers
**Setup:** Laptop with browser open to `http://localhost:5173` (or served from `dist/`)

---

## Act 1 — The Hook (2 min)

### What to show
Open Soliton in the browser. Empty map visible.

### What to say
> "This is Soliton — a hydraulic network design tool that runs entirely in your browser. No installation, no cloud account, no per-seat licence. It runs the same EPANET 2.2 engine that powers Bentley WaterGEMS — but compiled to WebAssembly so it works offline on any laptop."
>
> "Let me show you what it can do with an Ayodhya network."

---

## Act 2 — Load the Ayodhya Network (2 min)

### What to do
1. Click **Load Ayodhya Demo**
2. Select **"24x7 in 11 wards"**
3. Map zooms to show the network — WTP (blue circle), two overhead tanks (purple squares), ~35 junctions, ~50 pipes

### What to say
> "This is a synthetic but plausible model of Ayodhya's AMRUT 2.0 water distribution network. It's based on the actual schemes — the Saryu River source augmentation with a 100 MLD WTP, two overhead tanks, and a distribution grid covering 11 wards."
>
> "The blue circle is the WTP at the Saryu intake. The purple squares are the two overhead tanks — OHT1 serving the central and temple areas, OHT2 serving the south wards. Each junction represents a demand node — domestic connections, commercial areas, temples, ghats."

### What to point out
- WTP in the north (blue)
- OHT1 and OHT2 (purple)
- Dense central cluster (temple/ghat area — high demand)
- Spread-out peripheral nodes (south, east, far periphery)

---

## Act 3 — Run the Solver (3 min)

### What to do
1. Click **Compute**
2. Wait 1-2 seconds — junctions turn green or red
3. Zoom in to see node labels, pressure values, and pipe flows

### What to say
> "When I press Compute, the EPANET engine runs a full hydraulic analysis. Every junction gets a solved pressure — green means it meets the CPHEEO 17-metre residual pressure target for 24x7 supply. Red means it's deficient."
>
> "You can see the central area is mostly green — good pressure from the tanks. But look at the periphery — the far south-east nodes are red. These are the zones that need attention."

### What to point out
- Green nodes near OHT1 and OHT2 (adequate pressure)
- Red nodes in far periphery (F1, F2, F3 — small pipes, high elevation, long runs)
- Status badge in top bar showing "X/35 junctions pass"
- Zoom in to show pressure values (e.g., "24m" on a green node, "8m" on a red node)

---

## Act 4 — The Results Dashboard (3 min)

### What to do
1. Click **Results** button (green)
2. Dashboard opens at bottom with tabs: Nodes, Links, Tanks, NRW
3. Click column headers to sort (sort by Pressure ascending to see worst nodes first)
4. Click on a deficient node in the table — it selects on the map

### What to say
> "The results dashboard gives you a complete picture. Every junction is listed with its pressure, demand, and a pass/fail indicator against the CPHEEO standard."
>
> "Let me sort by pressure — ascending. You can immediately see which zones are most critically under-pressured. Click on any row and it highlights on the map."
>
> "The headline at the top tells you: what percentage of junctions pass, how many pipes are in the velocity band, and the NRW estimate."

### Tabs to show
- **Nodes tab:** Sort by pressure (ascending). Point out the FAIL nodes.
- **Links tab:** Sort by velocity. Show that some peripheral pipes have very low velocity (stagnation risk).
- **NRW tab:** Show system input vs summed demand. Point out leakage hotspots (nodes with excess pressure above the floor).

### What to say about NRW
> "The NRW readout scores the network against the AMRUT 2.0 target of less than 20% non-revenue water. High-pressure zones are flagged as leakage hotspots — because excess head is lost water. This tells you exactly where to focus pressure management."

---

## Act 5 — What-If Pipe Shutdown (2 min)

### What to do
1. Select a critical pipe in the central area (click on a pipe line near OHT1)
2. In the right Properties panel, change **Status** from "Open" to **"Closed"**
3. Click **Compute** again
4. Watch which junctions turn red — the affected zone

### What to say
> "Now let me show you what-if analysis. Imagine a main break on this pipe near OHT1. I close it — and recompute."
>
> "Instantly, you can see which junctions lose pressure. This is the information your maintenance crew needs before they even dispatch — they know exactly which zones are affected and how badly."
>
> "No other tool gives you this analysis in a browser, offline, in 2 seconds."

### After showing
1. Change the pipe back to **"Open"**
2. Recompute to restore normal state

---

## Act 6 — 24-Hour Extended Period Simulation (3 min)

### What to do
1. Click **Scenario** button
2. Change **Mode** from "Steady State" to **"24-hour EPS"**
3. Close the Scenario panel
4. Click **Compute** (takes slightly longer)
5. Use the **time slider** in the top bar to scrub through 24 hours

### What to say
> "Steady state tells you the design condition. But a real network lives through 24 hours — morning peak, afternoon lull, evening peak. Let me switch to extended-period simulation."
>
> "Now I can scrub through the day. Watch what happens at 6 AM when demand picks up — some green nodes start turning red. At 7 PM — the evening peak — that's when the peripheral zones really suffer."
>
> "And look at the time: 2 AM. Demand is low, pressure is high everywhere. Those green nodes at 2 AM are your overnight leakage zone — high pressure with no legitimate demand."

### What to point out
- Time slider shows HH:MM
- Node colors change as you scrub
- Flow labels on pipes change
- Status badge updates per timestep

### If time allows — Tank Traces
1. Click **Results** → **Tanks** tab
2. Show OHT1 and OHT2 level traces — they fill overnight, drain during peak hours
3. > "The tank level trace shows exactly how your OHTs behave. OHT1 drains significantly during evening peak — you might need to size it larger or adjust the feed rate."

---

## Act 7 — Design Criteria (1 min)

### What to do
1. Click **Scenario** button
2. Show the CPHEEO criteria panel
3. Change the **Pressure Floor** from 17m to 12m
4. Recompute — watch more nodes turn green

### What to say
> "All the design criteria are editable. We default to the CPHEEO 2024 24x7 DMA standard — 17 metres for Class I cities. But if you're designing for a smaller town, you can drop to 12 metres. Watch — several peripheral nodes that were failing now pass."
>
> "The LPCD is set to 135 for Ayodhya — a Class I city with sewerage. You can switch to 150 for a metro, or 70 for a small town. The demand pattern shows the 24-hour variation with a peak factor of about 2.5x."

### What to point out
- LPCD presets (150/135/100/70)
- Pressure floor presets (17/21/12/15/7-22m storey-based)
- The demand pattern bar chart — mention it's interactive (drag bars)
- Fire demand calculator

---

## Act 8 — Credibility Artifact (1 min)

### What to do
1. Click **Show INP** (bottom right)
2. Scroll through the generated INP file

### What to say
> "For any reviewer who wants to verify: this is the exact EPANET input file the solver ran. You can take this file, open it in WaterGEMS or EPANET directly, and get the same results. Nothing is hidden."

---

## Act 9 — Export & Report (1 min)

### What to do
1. Click **Nodes CSV** — downloads node results
2. Click **Pipes CSV** — downloads pipe results
3. Click **Print Summary** — opens printable one-page report
4. Click **INP** — downloads the model file

### What to say
> "Everything exports. Node and pipe results as CSV for your DPR spreadsheets. The model as an INP file for further analysis. And a printable one-page summary with the headline compliance metrics — pressure pass rate, velocity compliance, NRW — ready for your next review meeting."

---

## Act 10 — The Close (1 min)

### What to say
> "This is Soliton today — a design and verification tool. Every number comes from the EPANET engine. Every result maps to CPHEEO standards."
>
> "The roadmap is clear: the same model that validates your design today becomes your operations digital twin tomorrow. Feed in real pressure readings from field sensors — compare measured versus modelled — and you have live ground-truth for every zone in your network."
>
> "No $16,000 per-seat licence. No cloud dependency. One browser, one laptop, the full power of EPANET. That's what AMRUT 2.0 24x7 design should look like."

---

## Backup Scenarios (if audience asks)

### "Show me a different scenario"
Click **Load Ayodhya Demo** → select **"24x7 in 4 selected DMAs"** (smaller network, central zones only, usually all green).

### "Can you import our existing model?"
Click the INP import button → load their `.inp` file → Compute. Works with any EPANET-format model.

### "What about pumps?"
Press `U` for pump tool → click two nodes → set power in Properties panel → Compute. Show pump flow result.

### "What's the velocity situation?"
Results → Links tab → sort by velocity. Pipes are color-coded: green=economic band (1.0-1.5 m/s), orange=permissible (0.6-2.5), red=outside.

### "How do I save my work?"
Scenarios save to browser localStorage. Export as JSON for backup. Export INP for interoperability.

---

## Pre-Demo Checklist

- [ ] `npm run dev` running (or `dist/` served)
- [ ] Browser open, full screen, no other tabs
- [ ] Dev tools console closed
- [ ] Zoom level comfortable on projector/screen
- [ ] If presenting offline: confirm glyphs cached from a prior online load (labels won't render without glyphs on first-ever offline use)
- [ ] Practice the 10-act flow once — know where each button is
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
| WaterGEMS seat cost | ~$10-16k/yr | What the audience currently pays |
| Soliton cost | $0 | Browser, offline, no licence |
