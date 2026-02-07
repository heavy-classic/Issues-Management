const STEPS = ["initiate", "assigned", "completed"] as const;
const STEP_LABELS: Record<string, string> = {
  initiate: "Initiate",
  assigned: "Assigned",
  completed: "Completed",
};

interface Props {
  currentStatus: string;
  onStatusChange?: (status: string) => void;
}

export default function ActionWorkflowStepper({
  currentStatus,
  onStatusChange,
}: Props) {
  const currentIndex = STEPS.indexOf(
    currentStatus as (typeof STEPS)[number]
  );

  return (
    <div className="action-stepper">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        const canAdvance = onStatusChange && i === currentIndex + 1;

        return (
          <div key={step} className="action-stepper-step-wrapper">
            {i > 0 && (
              <div
                className={`action-stepper-line ${isDone || isActive ? "done" : ""}`}
              />
            )}
            <button
              className={`action-stepper-step ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}
              onClick={() => canAdvance && onStatusChange(step)}
              disabled={!canAdvance}
              title={canAdvance ? `Advance to ${STEP_LABELS[step]}` : STEP_LABELS[step]}
            >
              <span className="action-stepper-dot">
                {isDone ? "\u2713" : i + 1}
              </span>
              <span className="action-stepper-label">
                {STEP_LABELS[step]}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
