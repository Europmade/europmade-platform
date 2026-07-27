import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@europmade/utils";

/**
 * Button — CMP-005 uit het EuropMade Design System.
 *
 * Varianten en gedrag zijn 1-op-1 overgenomen uit
 * docs/02-ux/wireframes/sprint-1a/00-design-system-foundation.html
 * (.btn-primary / .btn-secondary / .btn-ghost / .btn-destructive / .btn-disabled).
 * Geen nieuwe variant of stijlkeuze toegevoegd.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-wf font-semibold transition-colors disabled:pointer-events-none disabled:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wf-900 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-wf-900 text-white border border-transparent hover:bg-wf-800",
        secondary: "bg-white text-wf-800 border border-wf-500 hover:bg-wf-100",
        ghost: "bg-transparent text-wf-700 border border-transparent underline hover:text-wf-900",
        destructive: "bg-white text-wf-900 border border-dashed border-wf-700 hover:bg-wf-100",
        disabled: "bg-wf-100 text-wf-400 border border-wf-200",
      },
      size: {
        default: "text-sm px-[18px] py-[9px]",
        sm: "text-xs px-3 py-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
