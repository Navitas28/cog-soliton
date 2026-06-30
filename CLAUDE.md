# CLAUDE.md — Soliton

## What is this

Browser-only water-distribution-network hydraulic design tool for Indian municipal use. First audience: Ayodhya Municipal Corporation. Uses EPANET 2.2 (WebAssembly) for real hydraulic analysis with CPHEEO design criteria. No backend, no server, no licence.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest (71 tests)
npm run build      # production build
```

## Architecture

```
UI (React + MapLibre GL)
  → State (Zustand + zundo undo/redo)
    → Solver (engine.ts → epanet-js WASM)
      → Model (types.ts → serializer.ts → INP string)
```

**Engine contract:** `serializeToInp(model) → INP string → epanet-js WASM → results`. The INP serializer is the single boundary between UI and solver. All hydraulic numbers come from the engine — never fabricated.

**Demand convention:** base demand = average-day demand = `population × lpcd / 86400` (LPS). Peak factor lives in the diurnal pattern, NOT in base demand. Never double-count.

## Stack (do not change)

| Dep | Version | Why |
|-----|---------|-----|
| `epanet-js` | `0.8.0` (pinned) | EPANET 2.2 WASM solver. Pre-1.0 beta — API can break. Do NOT use caret range. |
| `maplibre-gl` | `^4.7.1` | Map rendering |
| `zustand` | `^4.5.7` | State management (single store) |
| `zundo` | `^2.3.0` | Undo/redo via temporal middleware |
| `vite` | `^5.4.10` | Build tool |
| `vitest` | `^2.1.9` | Test runner |

## Key constraints

- **No backend.** Entire app runs in browser. No Express, no API, no server process.
- **No fabricated results.** Every hydraulic number rendered must come from epanet-js. Assume expert reviewer will verify.
- **SI units throughout.** Flow: LPS. Head/pressure: metres. Headloss: Hazen-Williams.
- **epanet-js WASM loading is async.** Always `await ws.loadModule()` before constructing `Project`. Missed await is the most common failure.
- **`optimizeDeps.exclude`** for `epanet-js` and `@model-create/epanet-engine` in vite.config.ts — required for WASM to bundle correctly.
- **Unique filenames per solve** in WASM filesystem (`s1.inp`, `s2.inp`...) to avoid stale file collisions between sequential solves.

## File map

```
src/
├── engine/
│   ├── engine.ts           # Solver wrapper: solveSteadyState(), solveEPS()
│   ├── minimalInp.ts       # Phase 1 proof INP
│   ├── telemetry.ts        # Telemetry types + mock generator (digital twin seam)
│   └── scadaAdapter.ts     # ScadaAdapter interface + MockScadaAdapter
├── model/
│   ├── types.ts            # All data types + defaults (Junction, Pipe, Tank, Pump, Valve, DesignCriteria...)
│   ├── serializer.ts       # NetworkModel → EPANET INP string
│   ├── parser.ts           # EPANET INP string → NetworkModel
│   ├── geodesic.ts         # Haversine distance for pipe length auto-calculation
│   └── demand.ts           # computeBaseDemand, computeFireDemand, DEFAULT_DIURNAL_PATTERN
├── store/
│   ├── networkStore.ts     # Zustand store: model + UI state + results + undo/redo
│   └── scenarioStore.ts    # Save/load/compare scenarios via localStorage
├── data/
│   ├── ayodhya.ts          # Ayodhya sample network fixture (3 AMRUT scenarios)
│   └── ayodhyaOutline.ts   # GeoJSON offline basemap (boundary, Saryu river, roads)
├── components/
│   ├── MapCanvas.tsx        # MapLibre GL map + network rendering + interactions
│   ├── mapHelpers.ts        # Pure GeoJSON builders (testable, no MapLibre dependency)
│   ├── Toolbar.tsx          # Left tool rail (S/R/J/T/P/U/V tools)
│   ├── PropertiesPanel.tsx  # Right panel: element property editor + results
│   ├── ScenarioPanel.tsx    # Scenario settings, CPHEEO criteria, pattern editor, fire demand
│   ├── ResultsDashboard.tsx # Sortable tables, headline summary, NRW, tank traces
│   ├── ExportPanel.tsx      # CSV/INP/print export
│   ├── DemoLoader.tsx       # Ayodhya demo loader with scenario picker
│   └── LoadingScreen.tsx    # WASM loading spinner
├── styles/
│   └── layout.css           # Three-panel layout
├── App.tsx                   # Root: LoadingScreen → layout
└── main.tsx                  # Entry point
```

## EPANET API reference (epanet-js 0.8.0)

```typescript
import { Workspace, Project, NodeProperty, LinkProperty, CountType, InitHydOption } from 'epanet-js';

// Init
const ws = new Workspace();
await ws.loadModule();
const project = new Project(ws);
ws.writeFile('model.inp', inpString);
project.open('model.inp', 'report.rpt', 'out.bin');

// Steady-state
project.solveH();
const pressure = project.getNodeValue(nodeIndex, NodeProperty.Pressure);  // 11
const flow = project.getLinkValue(linkIndex, LinkProperty.Flow);          // 8

// EPS loop
project.openH();
project.initH(InitHydOption.SaveAndInit);
let tStep = Infinity;
do {
  const cTime = project.runH();
  // read results at cTime...
  tStep = project.nextH();
} while (tStep > 0);
project.closeH();

project.close();
```

**Key enums:** `NodeProperty.Pressure=11`, `NodeProperty.Head=10`, `NodeProperty.Demand=9`, `NodeProperty.TankLevel=8`, `LinkProperty.Flow=8`, `LinkProperty.Velocity=9`, `LinkProperty.Headloss=10`, `CountType.NodeCount=0`, `CountType.LinkCount=2`.

## CPHEEO design criteria (defaults, user-overridable)

| Parameter | Default | Source |
|-----------|---------|--------|
| Per-capita supply | 135 lpcd | CPHEEO 2024 rev, Class I city with sewerage |
| Residual pressure floor | 17 m | CPHEEO 24x7 DMA target (Class I/II) |
| Pipe velocity | 0.6-2.5 m/s permissible, 1.0-1.5 economic | CPHEEO |
| Hazen-Williams C | 130-140 DI, 150 HDPE/PVC | CPHEEO |
| Peak factor | 2.5 | Verify against CPHEEO Ch. 2 |
| NRW target | <20% | AMRUT 2.0 |
| Design period | 30 years | CPHEEO |
| Fire demand | Q=100*sqrt(P) LPM | Verify against CPHEEO Ch. 2 |

## Testing

71 tests across 12 files. All phases are TDD — tests written first, gated.

```bash
npm test                    # run all
npx vitest run src/model/   # run model tests only
```

**Test categories:**
- `engine.test.ts` — WASM solver round-trip
- `serializer.test.ts` — INP output correctness, multi-node networks
- `parser.test.ts` — INP import, round-trip (serialize → parse → serialize = same result)
- `demand.test.ts` — demand calculation, fire demand, pattern validation
- `networkStore.test.ts` — store CRUD, solve integration
- `phase4.test.ts` — EPS, what-if pipe shutdown
- `phase7.test.ts` — moveNode, pump/valve add/update/delete/solve
- `phase8.test.ts` — undo/redo via zundo temporal
- `scenario.test.ts` — localStorage save/load/delete/export/import
- `mapHelpers.test.ts` — GeoJSON generation, offline style
- `ayodhya.test.ts` — all 3 Ayodhya scenarios load and solve
- `telemetry.test.ts` — mock telemetry generation, CSV parsing, SCADA adapter

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| S | Select tool |
| R | Place reservoir |
| J | Place junction |
| T | Place tank |
| P | Draw pipe |
| U | Draw pump |
| V | Draw valve |
| Delete/Backspace | Delete selected element |
| Escape | Deselect + cancel drawing |
| Ctrl+Z / Cmd+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |

## Common gotchas

1. **generateId must not mutate state.nextId** — returns `[id, newNextId]` tuple. Old mutation pattern caused cross-test state leaks.
2. **CountType.LinkCount = 2, not 1.** NodeCount=0, TankCount=1, LinkCount=2.
3. **`Pattern 1` in INP [OPTIONS]** — only emit if patterns exist, otherwise EPANET Error 200.
4. **MapLibre `line-dasharray`** does not support data expressions. Use separate layers (filtered) for solid vs dashed.
5. **MapLibre symbol layers require `glyphs` in style.** Offline style uses `demotiles.maplibre.org/font/` — needs internet for first load of glyphs.
6. **Pipe `length` vs coordinates** — EPANET uses `length` for head-loss, not coordinate distance. Auto-computed via haversine unless `lengthOverride=true`.
7. **Zustand temporal (zundo)** — only `model` field is tracked (`partialize`). UI state (tool, selection, results) excluded from undo history.

## MapLibre layers (source → layer mapping)

| Source | Layers | Purpose |
|--------|--------|---------|
| `ayodhya-outline` | outline-fill, outline-border, outline-river, outline-roads | Ayodhya basemap (hidden unless Ayodhya model loaded) |
| `network-links` | links-line, links-line-closed | Pipes/pumps/valves (solid + dashed) |
| `network-labels` | link-labels | Link ID + flow at midpoints (minzoom 13) |
| `network-nodes` | nodes-circle | Junctions/reservoirs/tanks (color by type + result) |
| `network-nodes` | node-labels, pressure-labels | Node IDs (minzoom 12), pressure values (minzoom 13) |

## Forward-compatibility seams (designed, not built)

- **Telemetry overlay:** `src/engine/telemetry.ts` — `TelemetryReading` type, `generateMockTelemetry()`, `parseTelemetryCsv()`. Feed measured pressures at monitored nodes, render measured-vs-modelled.
- **SCADA adapter:** `src/engine/scadaAdapter.ts` — `ScadaAdapter` interface + `MockScadaAdapter`. Future: WebSocket to SCADA gateway.
- **Scenario comparison:** `src/store/scenarioStore.ts` — save/load/compare models via localStorage.
- **Digital twin bridge:** results layer accepts both modelled and measured data at same nodes — seam for live field ground-truth comparison.

## Build phases (all complete)

| Phase | Commit | What |
|-------|--------|------|
| 1 | cfbf68a | Engine round-trip proof (WASM loads, solves) |
| 2 | dfd7b0f | Data model + INP serializer + geodesic |
| 3 | 0c443b7 | Three-panel UI, drawing tools, Compute |
| 4 | c812f6e | EPS, CPHEEO compliance, NRW, what-if shutdown |
| 5 | df5f1fb | Ayodhya sample network (3 AMRUT scenarios) |
| 6 | 9c1363a | Branding, loading screen, CSV/print export |
| 7 | 76b7390 | Keyboard shortcuts, node drag, pumps/valves UI |
| 8 | a03436c | Undo/redo (zundo temporal) |
| 9 | 0e1d66b | MapLibre GL basemap + Ayodhya GeoJSON |
| 10 | 210f56b | Interactive pattern editor + fire demand |
| 11 | 86dfceb | Pipe vertices + INP parser |
| 12 | a82a847 | Scenario save/load/compare |
| 13 | 0fb943f | Telemetry + SCADA seams |
