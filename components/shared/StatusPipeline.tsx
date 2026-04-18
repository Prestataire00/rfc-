"use client";

type Step = { value: string; label: string };

type Props = {
  steps: Step[];
  currentStatus: string;
  lostStatus?: string;
  successStatus?: string;
};

export function StatusPipeline({ steps, currentStatus, lostStatus = "perdu", successStatus }: Props) {
  const activeSteps = steps.filter((s) => s.value !== lostStatus);
  const currentIndex = activeSteps.findIndex((s) => s.value === currentStatus);
  const isLost = currentStatus === lostStatus;
  const currentStep = steps.find((s) => s.value === currentStatus);

  return (
    <div className="w-full">
      <div className="flex items-center gap-1">
        {activeSteps.map((step, index) => {
          const isActive = !isLost && index <= currentIndex;
          const isCurrent = step.value === currentStatus;
          const isSuccess = successStatus && step.value === successStatus && isCurrent;

          return (
            <div key={step.value} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-1.5 w-full rounded-full transition-colors ${
                  isLost
                    ? "bg-red-900/30"
                    : isActive
                    ? isSuccess
                      ? "bg-emerald-500"
                      : "bg-red-600"
                    : "bg-gray-700"
                }`}
              />
              <span className={`text-[9px] font-medium transition-colors ${
                isCurrent && !isLost ? "text-gray-300" : "text-gray-600"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      {isLost && currentStep && (
        <p className="text-[10px] font-medium text-red-500 mt-1 text-right">{currentStep.label}</p>
      )}
    </div>
  );
}
