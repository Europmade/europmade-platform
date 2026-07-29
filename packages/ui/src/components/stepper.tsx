import * as React from "react";
import { cn } from "@europmade/utils";

/**
 * Stepper — CMP-004 uit het EuropMade Design System.
 *
 * Structuur en staten (`is-active`, `is-done`) 1-op-1 overgenomen uit
 * `.stepper`/`.step`/`.step .dot` in
 * docs/02-ux/wireframes/sprint-1b/04-partner-onboarding-*.html.
 * Eerste toepassing (nog niet eerder gebouwd bij Checkout, dat later komt) —
 * geen nieuwe stijlkeuze t.o.v. de bevroren wireframe, uitsluitend hier voor
 * het eerst als herbruikbaar component uitgewerkt.
 */
export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: string[];
  /** 0-based index van de actieve stap. */
  currentStep: number;
}

export const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  ({ steps, currentStep, className, ...props }, ref) => {
    return (
      <ol
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-0 overflow-x-auto border-b border-wf-200 px-3 py-3 tablet:px-6 tablet:py-4",
          className,
        )}
        {...props}
      >
        {steps.map((label, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          return (
            <li
              key={label}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap px-2 text-[10px] text-wf-500 tablet:px-3 tablet:text-[11px]",
                isActive && "font-bold text-wf-900",
                isDone && "text-wf-700",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-wf-400 text-[9px] font-bold text-wf-500 tablet:h-5 tablet:w-5 tablet:text-[10px]",
                  isDone && "border-wf-900 bg-wf-900 text-white",
                  isActive && "border-wf-900 text-wf-900",
                )}
              >
                {isDone ? "✓" : index + 1}
              </span>
              <span className="hidden tablet:inline">{label}</span>
            </li>
          );
        })}
      </ol>
    );
  },
);
Stepper.displayName = "Stepper";
