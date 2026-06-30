import { useNetworkStore } from '../store/networkStore';

const STEPS = [
  { key: 'design', label: 'Design', num: 1 },
  { key: 'configure', label: 'Configure', num: 2 },
  { key: 'compute', label: 'Compute', num: 3 },
  { key: 'analyze', label: 'Analyze', num: 4 },
  { key: 'export', label: 'Export', num: 5 },
] as const;

export function WorkflowStepper() {
  const model = useNetworkStore(s => s.model);
  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);
  const showResultsDashboard = useNetworkStore(s => s.showResultsDashboard);
  const setShowScenarioPanel = useNetworkStore(s => s.setShowScenarioPanel);
  const setShowResultsDashboard = useNetworkStore(s => s.setShowResultsDashboard);
  const solve = useNetworkStore(s => s.solve);

  const totalElements = model.junctions.length + model.reservoirs.length + model.tanks.length
    + model.pipes.length + model.pumps.length + model.valves.length;
  const hasResults = !!(solveResult || epsResult);

  // Derive step states
  const completed: Record<string, boolean> = {
    design: totalElements > 0,
    configure: model.patterns.length > 0 || model.designCriteria.lpcd !== 135,
    compute: hasResults,
    analyze: hasResults && showResultsDashboard,
    export: false, // always available as next step when results exist
  };

  // Current step = rightmost completed + 1, or first incomplete
  let currentIdx = 0;
  for (let i = 0; i < STEPS.length; i++) {
    if (completed[STEPS[i].key]) currentIdx = i + 1;
  }
  if (currentIdx >= STEPS.length) currentIdx = STEPS.length - 1;

  const handleClick = (key: string) => {
    switch (key) {
      case 'configure': setShowScenarioPanel(true); break;
      case 'compute': solve(); break;
      case 'analyze': if (hasResults) setShowResultsDashboard(true); break;
    }
  };

  return (
    <div className="workflow-stepper" role="navigation" aria-label="Workflow steps">
      {STEPS.map((step, i) => (
        <div key={step.key} className="workflow-step-wrapper">
          {i > 0 && (
            <div className={`workflow-connector ${completed[STEPS[i - 1].key] ? 'done' : ''}`} />
          )}
          <button
            className={`workflow-step ${completed[step.key] ? 'done' : ''} ${i === currentIdx ? 'current' : ''}`}
            onClick={() => handleClick(step.key)}
            aria-current={i === currentIdx ? 'step' : undefined}
          >
            <span className="workflow-step-num">
              {completed[step.key] ? '✓' : step.num}
            </span>
            <span className="workflow-step-label">{step.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
