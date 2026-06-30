# Build Phases

## Phase 1 — Engine round-trip proof ✅
**Status:** PASS
**Verify:** `npm test` (vitest), then `npm run dev` → click "Run EPANET Solve" in browser
- Vite + React + TS scaffold
- epanet-js 0.8.0 pinned, WASM loads in browser
- Minimal network (1 reservoir, 1 junction, 1 pipe) solves via `solveH`
- Junction pressure returned: finite, positive, physically sane (~37 m)
- INP viewable in UI

## Phase 2 — Data model and INP serializer ✅
**Status:** PASS
**Verify:** `npm test` — serializer unit tests
- Full TypeScript network model types
- CPHEEO design criteria defaults (135 lpcd, 17m floor)
- `serializeToInp()` produces valid EPANET INP
- Haversine geodesic distance for pipe lengths
- 8 passing serializer/geodesic tests

## Phase 3 — One vertical slice end-to-end ✅
**Status:** PASS
**Verify:** Place reservoir + junction + pipe on map, Compute, verify pressure coloring
- Three-panel layout (tool rail, canvas, properties)
- Zustand store, interactive canvas with pan/zoom
- Drawing tools: reservoir, junction, pipe
- Compute button → pressure coloring (green/red at 17m floor)

## Phase 4 — Full canvas, EPS, CPHEEO compliance ✅
**Status:** PASS
**Verify:** EPS time-scrub, pass/fail overlay, what-if shutdown, tank trace, NRW readout
- 24-hour EPS with time slider
- Diurnal demand pattern editor
- Scenario panel with all CPHEEO criteria (editable)
- Results dashboard: sortable tables, headline summary
- Tank level trace charts (SVG)
- NRW/water-balance readout (AMRUT 2.0 target)
- What-if pipe shutdown

## Phase 5 — Ayodhya sample network ✅
**Status:** PASS
**Verify:** "Load Ayodhya demo" → solves with visible deficient zones
- ~35 junctions, ~50 pipes over real Ayodhya coordinates
- WTP source, 2 overhead tanks
- Temple/ghat high-demand zones
- Intentionally deficient peripheral zones
- Three AMRUT 2.0 scenario labels
- One-click demo loader

## Phase 6 — Branding and polish ✅
**Status:** PASS
**Verify:** `npm run build` + `npm run preview` — commercial finish, offline, CSV/print export
- Soliton branding: logo, color theme, favicon
- WASM loading screen
- CSV export (nodes, pipes)
- Printable one-page summary
- INP file download
- 17 passing tests across all phases
