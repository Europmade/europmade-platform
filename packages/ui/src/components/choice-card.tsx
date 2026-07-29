import * as React from "react";
import { cn } from "@europmade/utils";

/**
 * Choice Card — CMP-026 uit het EuropMade Design System, meervoudige variant.
 *
 * Structuur/staten (`is-selected`) 1-op-1 overgenomen uit `.choice-card` in
 * docs/02-ux/wireframes/sprint-1b/04-partner-onboarding-*.html. Meervoudige
 * selectie is geen wijziging aan het component zelf, uitsluitend het
 * selectiegedrag (components.md, CMP-026) — daarom `role="group"` +
 * `aria-pressed` per kaart in plaats van `role="radiogroup"`.
 */
export interface ChoiceCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onToggle"> {
  title: string;
  description: string;
  selected: boolean;
}

export const ChoiceCard = React.forwardRef<HTMLButtonElement, ChoiceCardProps>(
  ({ title, description, selected, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        className={cn(
          "flex flex-col items-center rounded-lg border-[1.5px] border-wf-400 px-3.5 py-[18px] text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wf-900 focus-visible:ring-offset-2",
          selected && "border-2 border-wf-900 bg-wf-100",
          className,
        )}
        {...props}
      >
        <span className="mb-2.5 h-9 w-9 rounded-full bg-wf-200" aria-hidden="true" />
        <span className="mb-1 text-[13px] font-bold text-wf-900">{title}</span>
        <span className="text-[10.5px] leading-relaxed text-wf-600">{description}</span>
        <span
          className={cn(
            "mt-2.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-wf-400 text-[10px] text-white",
            selected && "border-wf-900 bg-wf-900",
          )}
          aria-hidden="true"
        >
          {selected ? "✓" : ""}
        </span>
      </button>
    );
  },
);
ChoiceCard.displayName = "ChoiceCard";

/** Wrapper conform components.md, CMP-026: `role="group"` voor de meervoudige variant. */
export const ChoiceCardGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { label: string }
>(({ label, className, children, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    aria-label={label}
    className={cn("grid grid-cols-1 gap-3.5 tablet:grid-cols-3", className)}
    {...props}
  >
    {children}
  </div>
));
ChoiceCardGroup.displayName = "ChoiceCardGroup";
