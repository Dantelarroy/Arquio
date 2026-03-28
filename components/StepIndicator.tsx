"use client";

import clsx from "clsx";

const STEPS = [
  { id: "upload",  number: "01", label: "Subir Imágenes" },
  { id: "prompts", number: "02", label: "Revisar Prompts" },
  { id: "results", number: "03", label: "Resultados" },
];

export function StepIndicator({ currentStep }: { currentStep: string }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-stretch">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive    = index === currentIndex;
        const isLast      = index === STEPS.length - 1;

        return (
          <div key={step.id} className="flex items-stretch">
            {/* Step block */}
            <div
              className={clsx(
                "flex items-center gap-3 px-5 py-2.5 border-t-2 transition-all duration-300",
                isActive    && "border-[#C85A3C] bg-white",
                isCompleted && "border-[#C85A3C]",
                !isActive && !isCompleted && "border-[#E0DCD3]"
              )}
            >
              <span
                className={clsx(
                  "font-mono text-[10px] tracking-[3px] transition-colors",
                  isActive    && "text-[#C85A3C]",
                  isCompleted && "text-[#C85A3C]",
                  !isActive && !isCompleted && "text-[#6B6C6B]"
                )}
              >
                {isCompleted ? "✓" : step.number}
              </span>
              <span
                className={clsx(
                  "text-[11px] font-bold tracking-[2px] uppercase transition-colors hidden sm:block",
                  isActive    && "text-[#2A2B2A]",
                  isCompleted && "text-[#6B6C6B]",
                  !isActive && !isCompleted && "text-[#6B6C6B]/50"
                )}
              >
                {step.label}
              </span>
            </div>
            {/* Divider */}
            {!isLast && (
              <div className={clsx(
                "w-px self-stretch mt-2.5",
                isCompleted ? "bg-[#C85A3C]/30" : "bg-[#E0DCD3]"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
