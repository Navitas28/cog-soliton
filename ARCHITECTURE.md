# Architecture

## Layers (cleanly separable for future digital-twin overlay)

```
┌─────────────────────────────────────────┐
│  UI / Visualization Layer               │
│  React components, MapLibre, panels     │
├─────────────────────────────────────────┤
│  Results / Compliance Layer             │
│  CPHEEO criteria, pass/fail, NRW        │
├─────────────────────────────────────────┤
│  Solver Layer                           │
│  engine.ts → epanet-js (WASM)           │
├─────────────────────────────────────────┤
│  Network Model                          │
│  TypeScript types, INP serializer       │
│  Zustand store (Phase 3+)              │
└─────────────────────────────────────────┘
```

## Engine Contract

The network model serializes to a valid EPANET `.inp` string. That string is written into the epanet-js `Workspace`, opened as a `Project`, and solved. Results are read back via `getNodeValue` / `getLinkValue` with property enums. The INP serializer is the single contract between UI and solver.

## Data Model (Phase 2+)

- **Junction:** id, x, y, elevation, baseDemand, patternId
- **Pipe:** id, fromNode, toNode, length, diameter, roughness, status
- **Reservoir:** id, x, y, head
- **Tank:** id, x, y, elevation, initLevel, minLevel, maxLevel, diameter
- **Pump/Valve:** optional (Phase 4)
- **Pattern:** id, multipliers[]
- **Options:** flowUnits (LPS), headloss (H-W), duration, timestep

## File Map

```
src/
├── engine/
│   ├── engine.ts          # Solver wrapper (steady-state + EPS)
│   ├── minimalInp.ts      # Phase 1 proof INP
│   └── engine.test.ts     # Vitest tests
├── App.tsx                # Root component
├── main.tsx               # Entry point
└── App.css                # Styles
```

## Forward-Compatibility Seam

The solver layer (`engine.ts`) accepts INP strings and returns result maps keyed by node/link ID and timestep. A future telemetry overlay can feed measured pressures/flows at monitored nodes and render measured-vs-modelled beside design results — the results layer is designed for this comparison without coupling to the solver internals.
