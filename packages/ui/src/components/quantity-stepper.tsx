import * as React from "react";
import { cn } from "@europmade/utils";

/**
 * QuantityStepper — CMP-039 uit het EuropMade Design System.
 * Eerst toegepast in Winkelwagen (sprint-1b).
 */
export interface QuantityStepperProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}

export const QuantityStepper = React.forwardRef<
  HTMLDivElement,
  QuantityStepperProps
>(
  (
    { value, min = 1, max, onChange, disabled, className, ...props },
    ref,
  ) => {
    const atMin = value <= min;
    const atMax = max != null && value >= max;

    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center gap-1", className)}
        {...props}
      >
        <button
          type="button"
          aria-label="Aantal verlagen"
          disabled={disabled || atMin}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded border border-wf-400 text-sm font-bold text-wf-800 disabled:cursor-not-allowed disabled:opacity-40",
            atMin && "is-min",
          )}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span
          aria-live="polite"
          className="min-w-[2rem] text-center text-sm font-semibold text-wf-900"
        >
          {value}
        </span>
        <button
          type="button"
          aria-label="Aantal verhogen"
          disabled={disabled || atMax}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded border border-wf-400 text-sm font-bold text-wf-800 disabled:cursor-not-allowed disabled:opacity-40",
            atMax && "is-max",
          )}
          onClick={() =>
            onChange(max != null ? Math.min(max, value + 1) : value + 1)
          }
        >
          +
        </button>
      </div>
    );
  },
);
QuantityStepper.displayName = "QuantityStepper";
