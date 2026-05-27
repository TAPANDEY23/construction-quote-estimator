const STEPS = [
  'Location',
  'Build Size',
  'Rooms',
  'Garage',
  'Build Type',
  'Inclusions',
  'Special',
];

export default function ProgressBar({ currentStep, totalSteps }) {
  const pct = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="progress-wrapper">
      <div className="progress-header">
        <span className="progress-label">Step {currentStep} of {totalSteps}</span>
        <span className="progress-counter">{STEPS[currentStep - 1]}</span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-steps">
        {STEPS.map((name, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          return (
            <div key={i} className="progress-step">
              <div className={`step-dot ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                {isDone ? '✓' : stepNum}
              </div>
              <span className="step-name">{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
