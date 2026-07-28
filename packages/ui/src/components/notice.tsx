import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@europmade/utils";

/**
 * Notice — CMP-011 uit het EuropMade Design System.
 *
 * Varianten 1-op-1 overgenomen uit .notice / .notice.warn in
 * docs/02-ux/wireframes/sprint-1b/03-authenticatie-*.html. Geen nieuwe variant
 * toegevoegd t.o.v. de bevroren wireframes (info/warning).
 */
const noticeVariants = cva(
  "rounded border border-dashed px-[11px] py-[9px] text-[11.5px] leading-relaxed",
  {
    variants: {
      variant: {
        info: "border-wf-400 bg-wf-100 text-wf-700",
        warning: "border-wf-700 bg-wf-100 text-wf-700",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

export interface NoticeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof noticeVariants> {}

export const Notice = React.forwardRef<HTMLDivElement, NoticeProps>(
  ({ className, variant, role, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role={role ?? (variant === "warning" ? "alert" : undefined)}
        className={cn(noticeVariants({ variant }), className)}
        {...props}
      />
    );
  },
);
Notice.displayName = "Notice";

export { noticeVariants };
