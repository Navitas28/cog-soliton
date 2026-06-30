/**
 * EPANET engine wrapper — the single interface between the UI and the solver.
 * All hydraulic results come from the epanet-js toolkit (MIT-licensed OWA-EPANET 2.2 WASM).
 */
import { Workspace, Project, NodeProperty, LinkProperty, InitHydOption, CountType } from 'epanet-js';

export interface NodeResult {
  pressure: number;
  head: number;
  demand: number;
  tankLevel: number; // only meaningful for tanks, 0 for junctions/reservoirs
}

export interface LinkResult {
  flow: number;
  velocity: number;
  headloss: number;
}

export interface SteadyStateResult {
  nodeResults: Map<string, NodeResult>;
  linkResults: Map<string, LinkResult>;
}

let _workspace: Workspace | null = null;
let _solveCounter = 0;

/** Lazily initialise the WASM workspace — must be awaited before any solver call. */
export async function getWorkspace(): Promise<Workspace> {
  if (_workspace && _workspace.isLoaded) return _workspace;
  _workspace = new Workspace();
  await _workspace.loadModule();
  return _workspace;
}

/** Unique file prefix to avoid stale WASM filesystem collisions between solves */
function solvePrefix(): string {
  return `s${++_solveCounter}`;
}

/**
 * Run a steady-state hydraulic solve on the given INP string.
 * Returns per-node pressures and per-link flows read directly from the engine.
 */
export async function solveSteadyState(inp: string): Promise<SteadyStateResult> {
  const ws = await getWorkspace();
  const project = new Project(ws);

  // Write INP to WASM virtual filesystem with unique names
  const pfx = solvePrefix();
  ws.writeFile(`${pfx}.inp`, inp);
  project.open(`${pfx}.inp`, `${pfx}.rpt`, `${pfx}.bin`);

  project.solveH();

  const nodeResults = new Map<string, { pressure: number; head: number; demand: number }>();
  const linkResults = new Map<string, { flow: number; velocity: number; headloss: number }>();

  // Read node results
  const nodeCount = project.getCount(CountType.NodeCount);
  for (let i = 1; i <= nodeCount; i++) {
    const id = project.getNodeId(i);
    nodeResults.set(id, {
      pressure: project.getNodeValue(i, NodeProperty.Pressure),
      head: project.getNodeValue(i, NodeProperty.Head),
      demand: project.getNodeValue(i, NodeProperty.Demand),
      tankLevel: project.getNodeValue(i, NodeProperty.TankLevel),
    });
  }

  // Read link results
  const linkCount = project.getCount(CountType.LinkCount);
  for (let i = 1; i <= linkCount; i++) {
    const id = project.getLinkId(i);
    linkResults.set(id, {
      flow: project.getLinkValue(i, LinkProperty.Flow),
      velocity: project.getLinkValue(i, LinkProperty.Velocity),
      headloss: project.getLinkValue(i, LinkProperty.Headloss),
    });
  }

  project.close();

  return { nodeResults, linkResults };
}

/**
 * Run an extended-period simulation (EPS) over the full duration.
 * Returns results indexed by timestep (seconds) then by node/link id.
 */
export interface EPSResults {
  timestamps: number[];
  nodeResults: Map<number, Map<string, NodeResult>>;
  linkResults: Map<number, Map<string, LinkResult>>;
}

export async function solveEPS(inp: string): Promise<EPSResults> {
  const ws = await getWorkspace();
  const project = new Project(ws);

  const pfx = solvePrefix();
  ws.writeFile(`${pfx}.inp`, inp);
  project.open(`${pfx}.inp`, `${pfx}.rpt`, `${pfx}.bin`);

  const timestamps: number[] = [];
  const nodeResults = new Map<number, Map<string, { pressure: number; head: number; demand: number }>>();
  const linkResults = new Map<number, Map<string, { flow: number; velocity: number; headloss: number }>>();

  const nodeCount = project.getCount(CountType.NodeCount);
  const linkCount = project.getCount(CountType.LinkCount);

  project.openH();
  project.initH(InitHydOption.SaveAndInit);

  let tStep = Infinity;
  do {
    const cTime = project.runH();
    timestamps.push(cTime);

    // Capture node results at this timestep
    const stepNodes = new Map<string, { pressure: number; head: number; demand: number }>();
    for (let i = 1; i <= nodeCount; i++) {
      const id = project.getNodeId(i);
      stepNodes.set(id, {
        pressure: project.getNodeValue(i, NodeProperty.Pressure),
        head: project.getNodeValue(i, NodeProperty.Head),
        demand: project.getNodeValue(i, NodeProperty.Demand),
      });
    }
    nodeResults.set(cTime, stepNodes);

    // Capture link results at this timestep
    const stepLinks = new Map<string, { flow: number; velocity: number; headloss: number }>();
    for (let i = 1; i <= linkCount; i++) {
      const id = project.getLinkId(i);
      stepLinks.set(id, {
        flow: project.getLinkValue(i, LinkProperty.Flow),
        velocity: project.getLinkValue(i, LinkProperty.Velocity),
        headloss: project.getLinkValue(i, LinkProperty.Headloss),
      });
    }
    linkResults.set(cTime, stepLinks);

    tStep = project.nextH();
  } while (tStep > 0);

  project.closeH();
  project.close();

  return { timestamps, nodeResults, linkResults };
}

export { NodeProperty, LinkProperty, InitHydOption, CountType };
