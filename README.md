# Soliton

**Browser-only hydraulic network design tool for Indian municipal water distribution systems.**

Soliton runs the real US-EPA EPANET 2.2 solver (compiled to WebAssembly) entirely in your browser. No backend, no installation, no per-seat licence. Design, analyse, and verify water networks against Indian CPHEEO standards -- offline.

![Status](https://img.shields.io/badge/tests-71%20passing-brightgreen) ![License](https://img.shields.io/badge/license-proprietary-blue)

---

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9

## Getting Started

```bash
# Clone the repository
git clone https://github.com/cognecto/soliton.git
cd soliton

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm test` | Run all 71 tests (vitest) |
| `npm run lint` | Run ESLint |

## Try the Demo

1. Click **Load Ayodhya Demo** and select a scenario
2. Click **Compute** to run the hydraulic solver
3. See junctions turn **green** (meets 17m pressure floor) or **red** (deficient)
4. Zoom in to see node IDs, pressures, and pipe flows
5. Click **Results** to open the dashboard with sortable tables
6. Click **Scenario** to edit CPHEEO design criteria
7. Try closing a pipe (select it, change Status to Closed, recompute) for what-if analysis
8. Use the time slider (in EPS mode) to scrub through 24 hours and watch evening peak
9. Export results as CSV or print a one-page summary

## Features

### Hydraulic Engine
- Real EPANET 2.2 solver via WebAssembly (`epanet-js` 0.8.0)
- Steady-state and 24-hour extended-period simulation (EPS)
- Every result comes from the engine -- nothing fabricated

### Network Design
- Place junctions, reservoirs, tanks, pipes, pumps, and valves
- Click-and-drag nodes to reposition (pipe lengths auto-update)
- Edit properties in the right panel (elevation, demand, diameter, roughness...)
- Import existing `.inp` files

### CPHEEO Compliance
- Residual pressure pass/fail overlay (default 17m floor for 24x7 DMA)
- Velocity band checking (0.6-2.5 m/s permissible, 1.0-1.5 economic)
- Non-revenue water (NRW) readout scored against AMRUT 2.0 target (<20%)
- Leakage hotspot identification (excess head zones)
- Fire demand calculator (Kuichling formula)

### Visualization
- MapLibre GL map with pan/zoom
- Ayodhya GeoJSON basemap (municipal boundary, Saryu river, roads)
- Color-coded nodes (pressure) and pipes (velocity)
- EPS time slider for 24-hour scrubbing
- Tank level trace charts

### Productivity
- Keyboard shortcuts (S/R/J/T/P/U/V for tools, Delete, Escape, Ctrl+Z)
- Undo/redo (50-step history)
- Save/load scenarios (browser localStorage)
- Export: CSV (nodes, pipes), INP file, printable summary
- Demand pattern editor (drag bars to shape 24-hour diurnal curve)

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript | UI framework (browser-only, no backend) |
| [epanet-js](https://github.com/epanet-js/epanet-js-toolkit) 0.8.0 | EPANET 2.2 WASM hydraulic solver (MIT) |
| [MapLibre GL](https://maplibre.org/) | Interactive map rendering |
| [Zustand](https://zustand-demo.pmnd.rs/) | State management |
| [zundo](https://github.com/charkour/zundo) | Undo/redo middleware |
| [Vitest](https://vitest.dev/) | Test runner (71 tests) |

## Project Structure

```
src/
├── engine/          # EPANET WASM wrapper, telemetry seam
├── model/           # Data types, INP serializer, INP parser, demand helpers
├── store/           # Zustand state management, scenario persistence
├── data/            # Ayodhya sample network fixture, GeoJSON basemap
├── components/      # React UI (MapCanvas, Toolbar, panels, exports)
└── styles/          # CSS layout
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed layer diagram and file map.

## Design Criteria (CPHEEO defaults)

All values are user-editable in the Scenario panel.

| Parameter | Default | Source |
|-----------|---------|--------|
| Per-capita supply | 135 lpcd | CPHEEO 2024 rev, Class I with sewerage |
| Residual pressure floor | 17 m | CPHEEO 24x7 DMA target (Class I/II) |
| Pipe velocity | 0.6-2.5 m/s (permissible), 1.0-1.5 (economic) | CPHEEO |
| Hazen-Williams C | 130-140 DI, 150 HDPE/PVC | CPHEEO |
| Peak factor | 2.5 | Verify against CPHEEO Ch. 2 |
| NRW target | <20% | AMRUT 2.0 |
| Design period | 30 years | CPHEEO |

## Ayodhya Demo Scenarios

Three AMRUT 2.0 scenarios modelled on real Ayodhya schemes (UP Jal Nigam):

1. **24x7 in 11 wards** -- full DMA coverage (~35 junctions, ~50 pipes, WTP + 2 OHTs)
2. **24x7 in 4 selected DMAs** -- central/ghat zones only
3. **Saryu source augmentation Phase 1** -- transmission infrastructure

The network includes intentionally deficient peripheral zones to demonstrate the compliance overlay.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Select tool |
| `R` | Place reservoir |
| `J` | Place junction |
| `T` | Place tank |
| `P` | Draw pipe |
| `U` | Draw pump |
| `V` | Draw valve |
| `Delete` | Delete selected element |
| `Escape` | Deselect / cancel drawing |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |

## Offline Use

Soliton works offline after the first load. The EPANET engine is bundled as WebAssembly in the JavaScript bundle. The Ayodhya basemap uses bundled GeoJSON (no tile server). Font glyphs are fetched once from MapLibre demo servers on first load.

For fully air-gapped deployment, run `npm run build` and serve the `dist/` folder from any static file server.

## Contributing

See [CLAUDE.md](CLAUDE.md) for detailed development guidelines, gotchas, and API reference.

```bash
# Run tests before committing
npm test

# Build check
npm run build
```

## Positioning

- Same browser-based accessibility as Bentley WaterGEMS, without the ~$10k-16k/seat cost or cloud dependency
- Design-and-verification layer today; roadmap to operations digital twin (live IoT ground-truth over the hydraulic model)
- Speaks the audience's metrics: residual pressure at peak hour, velocity compliance, NRW/leakage exposure -- in CPHEEO terms, not SaaS terms

## License

Proprietary. All rights reserved.
