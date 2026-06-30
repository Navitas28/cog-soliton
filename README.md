# Soliton

**Browser-only water-distribution-network hydraulic design and demonstration tool for Indian municipal use.**

Soliton runs entirely client-side — no backend, no per-seat licence. It uses the MIT-licensed `epanet-js` toolkit (OWA-EPANET 2.2 compiled to WebAssembly) for real hydraulic analysis, and applies CPHEEO design criteria for Indian municipal networks.

First audience: Ayodhya Municipal Corporation.

## Quick Start

```bash
npm install
npm run dev        # development server at http://localhost:5173
npm run build      # production build to dist/
npm run preview    # preview production build
npm test           # run vitest tests
```

## Stack

- **Vite + React + TypeScript** — browser-only, no backend
- **epanet-js 0.8.0** — MIT-licensed EPANET 2.2 WASM toolkit (pinned, pre-1.0 beta)
- **MapLibre GL** — map rendering (Phase 3+)
- **Zustand** — state management (Phase 3+)

## Demo Script

1. Open the app in any browser (works offline after initial load)
2. Load the Ayodhya sample network (Phase 5)
3. Press **Compute** to run the hydraulic solver
4. View pressure compliance overlay (green = meets CPHEEO 17m floor, red = deficient)
5. Toggle the time slider to scrub 24-hour extended-period simulation
6. Use what-if shutdown to simulate main breaks
7. Show the generated INP file for credibility

## Design Criteria (CPHEEO defaults, user-overridable)

| Parameter | Default | Source |
|-----------|---------|--------|
| Per-capita supply | 135 lpcd (Ayodhya) | CPHEEO 2024 rev, Class I |
| Residual pressure floor | 17 m | CPHEEO 24x7 DMA target |
| Pipe velocity | 0.6-2.5 m/s permissible, 1.0-1.5 economic | CPHEEO |
| Hazen-Williams C | 130-140 DI, 150 HDPE/PVC | CPHEEO |
| NRW target | <20% | AMRUT 2.0 |

## Positioning

- Same browser-based accessibility as commercial tools (Bentley WaterGEMS), without ~$10k-16k/seat cost or cloud dependency
- Design-and-verification layer today; roadmap to operations digital twin (live IoT ground-truth over the model)
- Speaks the audience's metrics: residual pressure at peak hour, velocity compliance, NRW/leakage exposure -- in CPHEEO terms
