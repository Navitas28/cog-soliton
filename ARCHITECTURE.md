# Architecture

## Layers (cleanly separable for future digital-twin overlay)

```
┌─────────────────────────────────────────┐
│  UI / Visualization Layer               │
│  React components, Canvas2D, panels     │
├─────────────────────────────────────────┤
│  Results / Compliance Layer             │
│  CPHEEO criteria, pass/fail, NRW, EPS   │
├─────────────────────────────────────────┤
│  State Management                       │
│  Zustand store, time-indexed results    │
├─────────────────────────────────────────┤
│  Solver Layer                           │
│  engine.ts → epanet-js (WASM)           │
├─────────────────────────────────────────┤
│  Network Model                          │
│  TypeScript types, INP serializer       │
└─────────────────────────────────────────┘
```

## Engine Contract

The network model serializes to a valid EPANET `.inp` string. That string is written into the epanet-js `Workspace`, opened as a `Project`, and solved. Results are read back via `getNodeValue` / `getLinkValue` with property enums. The INP serializer is the single contract between UI and solver.

**Demand convention:** base demand = average-day demand (population x lpcd / 86400). Peak factor applied via diurnal pattern, never double-counted.

## Data Model

- **Junction:** id, x, y, elevation, baseDemand, patternId
- **Pipe:** id, fromNode, toNode, length (auto/override), diameter, roughness, status
- **Reservoir:** id, x, y, head (constant-head source)
- **Tank:** id, x, y, elevation, initLevel, minLevel, maxLevel, diameter
- **Pump:** id, fromNode, toNode, power/curveId, speed, patternId
- **Valve:** id, fromNode, toNode, diameter, type, setting
- **Pattern:** id, multipliers[] (24-hour diurnal curve)
- **DesignCriteria:** lpcd, peakFactor, pressureFloor, velocity bands, NRW target
- **Options:** flowUnits (LPS), headloss (H-W), duration, timestep

## File Map

```
src/
├── engine/
│   ├── engine.ts           # Solver wrapper (steady-state + EPS)
│   ├── minimalInp.ts       # Phase 1 proof INP
│   └── engine.test.ts      # Engine tests
├── model/
│   ├── types.ts            # Network model types + defaults
│   ├── serializer.ts       # INP serializer (UI↔solver contract)
│   ├── serializer.test.ts  # Serializer tests
│   ├── geodesic.ts         # Haversine pipe length helper
│   └── demand.ts           # Demand helpers + diurnal pattern
├── store/
│   ├── networkStore.ts     # Zustand store (model + UI + results)
│   ├── networkStore.test.ts
│   └── phase4.test.ts      # EPS + what-if tests
├── data/
│   ├── ayodhya.ts          # Ayodhya sample network fixture
│   ├── ayodhyaOutline.ts   # GeoJSON offline basemap
│   └── ayodhya.test.ts     # Ayodhya network tests
├── components/
│   ├── MapCanvas.tsx        # Interactive canvas + top bar
│   ├── Toolbar.tsx          # Left tool rail
│   ├── PropertiesPanel.tsx  # Right properties editor
│   ├── ScenarioPanel.tsx    # Scenario/criteria settings
│   ├── ResultsDashboard.tsx # Results tables + charts
│   ├── DemoLoader.tsx       # Ayodhya demo loader
│   ├── ExportPanel.tsx      # CSV/INP/print export
│   └── LoadingScreen.tsx    # WASM loading state
├── styles/
│   └── layout.css           # Three-panel layout styles
├── App.tsx                   # Root component
└── main.tsx                  # Entry point
```

## Forward-Compatibility Seam

The solver layer (`engine.ts`) accepts INP strings and returns result maps keyed by node/link ID and timestep. A future telemetry overlay can feed measured pressures/flows at monitored nodes and render measured-vs-modelled beside design results — the results layer is designed for this comparison without coupling to the solver internals.

The seam for an operations digital twin:
1. The `NodeResult` / `LinkResult` types already carry the fields a telemetry feed would populate
2. The time-indexed EPS results can be extended with a "measured" channel alongside "modelled"
3. The compliance layer evaluates against design criteria — the same layer can score measured data
