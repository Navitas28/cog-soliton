# Build Phases

## Phase 1 — Engine round-trip proof ✅
**Status:** PASS
**Verify:** `npm test` (vitest), then `npm run dev` → click "Run EPANET Solve" in browser
- Vite + React + TS scaffold
- epanet-js 0.8.0 pinned, WASM loads in browser
- Minimal network (1 reservoir, 1 junction, 1 pipe) solves via `solveH`
- Junction pressure returned: finite, positive, physically sane (~37 m)
- INP viewable in UI

## Phase 2 — Data model and INP serializer
**Status:** PENDING
**Verify:** `npm test` — serializer unit tests

## Phase 3 — One vertical slice end-to-end
**Status:** PENDING
**Verify:** Place reservoir + junction + pipe on map, Compute, verify pressure coloring

## Phase 4 — Full canvas, EPS, CPHEEO compliance
**Status:** PENDING
**Verify:** EPS time-scrub, pass/fail overlay, what-if shutdown, tank trace, NRW readout

## Phase 5 — Ayodhya sample network
**Status:** PENDING
**Verify:** "Load Ayodhya demo" → solves with visible deficient zones

## Phase 6 — Branding and polish
**Status:** PENDING
**Verify:** Commercial-grade finish, offline, CSV/print export
