import React from "react";

interface Props {
  phases: string[];
  currentPhase: string | null;
  status: string;
}

export default function AuditPhaseProgress({ phases, currentPhase, status }: Props) {
  const currentIdx = phases.indexOf(currentPhase || "");
  const isClosed = status === "closed";
  const isCancelled = status === "cancelled";

  return (
    <div className="workflow-container">
      <div className="workflow-title">AUDIT WORKFLOW</div>
      <div className="workflow-steps">
        {phases.map((phase, idx) => {
          const isComplete = isClosed || idx < currentIdx;
          const isCurrent = !isClosed && !isCancelled && idx === currentIdx;
          const stateClass = isComplete ? "completed" : isCurrent ? "active" : "pending";

          return (
            <React.Fragment key={phase}>
              {idx > 0 && (
                <div className={`step-connector ${isComplete || isCurrent ? "step-connector-done" : ""}`} />
              )}
              <div className={`step-box ${stateClass}`}>
                <div className="step-icon">
                  {isComplete ? "\u2713" : isCurrent ? "\u25CF" : "\u25CB"}
                </div>
                <div className="step-name">{phase}</div>
                <div className="step-time">
                  {isComplete ? "Completed" : isCurrent ? "Current Phase" : "Not Started"}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
