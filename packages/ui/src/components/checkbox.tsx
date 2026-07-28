import * as React from "react";
import { cn } from "@europmade/utils";

/**
 * Checkbox — CMP-007 uit het EuropMade Design System.
 *
 * Structuur 1-op-1 overgenomen uit .checkbox-row / .checkbox-inline in
 * docs/02-ux/wireframes/sprint-1b/03-authenticatie-*.html. Native <input> + <label>,
 * conform de toegankelijkheidseis in components.md.
 */
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div>
        <label
          htmlFor={inputId}
          className="flex cursor-pointer items-center gap-[7px] text-xs text-wf-700"
        >
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            aria-invalid={!!error || undefined}
            className={cn(
              "h-[15px] w-[15px] flex-shrink-0 rounded-[3px] border border-wf-500 text-wf-900",
              "focus:outline-none focus:ring-2 focus:ring-wf-900 focus:ring-offset-1",
              error && "border-wf-700",
              className,
            )}
            {...props}
          />
          <span>{label}</span>
        </label>
        {error && (
          <p role="alert" className="mt-1 text-[10.5px] text-wf-700">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";
