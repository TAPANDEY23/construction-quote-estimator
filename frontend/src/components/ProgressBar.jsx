const STEP_NAMES = [
  'Location',          // 1
  'Site Conditions',   // 2
  'Land & Size',       // 3
  'Roof Type',         // 4
  'Facade',            // 5
  'Finish Level',      // 6
  'Ceilings',          // 7
  'Glazing',           // 8
  'Bedrooms',          // 9
  'Bathrooms',         // 10
  'Living Areas',      // 11
  'Kitchen',           // 12
  'Laundry',           // 13
  'Garage',            // 14
  'Outdoor Living',    // 15
  'Optional Features', // 16
];

const PHASES = [
  { label: 'Location',    short: 'Location',  steps: [1] },
  { label: 'Land & Site', short: 'Land',      steps: [2, 3] },
  { label: 'Exterior',    short: 'Exterior',  steps: [4, 5] },
  { label: 'Spec.',       short: 'Spec.',     steps: [6, 7, 8] },
  { label: 'Interior',    short: 'Interior',  steps: [9, 10, 11, 12, 13, 14] },
  { label: 'Add-ons',     short: 'Add-ons',   steps: [15, 16] },
];

export default function ProgressBar({ currentStep, totalSteps }) {
  const pct = ((currentStep - 1) / (totalSteps - 1)) * 100;
  const currentName = STEP_NAMES[currentStep - 1] || `Step ${currentStep}`;
  const currentPhaseIdx = PHASES.findIndex(p => p.steps.includes(currentStep));

  return (
    <div className="progress-wrapper">
      <div className="progress-header">
        <span className="progress-label">Step {currentStep} of {totalSteps}</span>
        <span className="progress-counter">{currentName}</span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="phase-row">
        {PHASES.map((phase, i) => {
          const allDone = phase.steps.every(s => s < currentStep);
          const isActive = i === currentPhaseIdx;
          const cls = allDone ? 'phase-pill--done'
                    : isActive ? 'phase-pill--active'
                    : 'phase-pill--upcoming';
          return (
            <div key={i} className={`phase-pill ${cls}`} title={phase.label}>
              {allDone ? `✓` : phase.short}
            </div>
          );
        })}
      </div>
    </div>
  );
}
