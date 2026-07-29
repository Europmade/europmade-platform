import * as React from "react";
import { cn } from "@europmade/utils";

/**
 * Review Block — CMP-030 uit het EuropMade Design System (variant "met
 * Wijzigen-link", components.md sectie 3A). Structuur 1-op-1 overgenomen uit
 * `.review-section`/`.review-head`/`.review-line` in
 * docs/02-ux/wireframes/sprint-1b/04-partner-onboarding-*.html — zelfde
 * patroon als Checkout Stap 3 (nog niet gebouwd; eerste keer hier
 * uitgewerkt als herbruikbaar component).
 */
export interface ReviewBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  onEdit?: () => void;
  editLabel?: string;
}

export const ReviewBlock = React.forwardRef<HTMLDivElement, ReviewBlockProps>(
  ({ title, onEdit, editLabel = "Wijzigen", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("border-b border-wf-200 py-4 last:border-b-0", className)}
        {...props}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-wf-900">{title}</h3>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="text-[11px] text-wf-700 underline decoration-dotted"
            >
              {editLabel}
            </button>
          )}
        </div>
        <div className="space-y-0.5 text-xs text-wf-700">{children}</div>
      </div>
    );
  },
);
ReviewBlock.displayName = "ReviewBlock";
