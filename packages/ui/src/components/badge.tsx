import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@europmade/utils";

/**
 * Badge — CMP-008 uit het EuropMade Design System.
 *
 * Eerste toepassing: statuslabel op de Partner Onboarding-statuspagina
 * (`.status-badge` in docs/02-ux/wireframes/sprint-1b/04-partner-onboarding-*.html).
 * Component-id kent drie varianten (Outline/Solid/Link, components.md CMP-008);
 * uitsluitend "outline" komt in de bevroren wireframe voor, hier meegenomen
 * omdat het component zelf al drie varianten kent — geen nieuwe stijlkeuze.
 */
const badgeVariants = cva(
  "inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold",
  {
    variants: {
      variant: {
        outline: "border-wf-400 bg-white text-wf-700",
        solid: "border-transparent bg-wf-900 text-white",
        link: "border-transparent bg-transparent p-0 text-wf-800 underline decoration-dotted",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
    );
  },
);
Badge.displayName = "Badge";

export { badgeVariants };
