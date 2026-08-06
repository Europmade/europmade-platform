import * as React from "react";
import { cn } from "@europmade/utils";

/**
 * Form Field — CMP-006 uit het EuropMade Design System.
 *
 * Structuur en gedrag zijn 1-op-1 overgenomen uit
 * docs/02-ux/wireframes/sprint-1b/03-authenticatie-*.html (.field / .field label /
 * .field input / .field-hint). Geen nieuwe variant of stijlkeuze toegevoegd.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="mb-4">
        <label htmlFor={inputId} className="mb-[5px] block text-xs font-semibold text-wf-800">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={!!error || undefined}
          className={cn(
            "h-10 w-full rounded-wf border border-wf-400 px-3 text-[13px] text-wf-900 placeholder:text-wf-500",
            "focus:outline-none focus:ring-2 focus:ring-wf-900 focus:ring-offset-1",
            error && "border-wf-700",
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="mt-1 text-[10.5px] text-wf-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-[10.5px] text-wf-700">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
