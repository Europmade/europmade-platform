import type { ReactNode } from "react";
import { cn } from "@europmade/utils";

/**
 * `.status-block` uit docs/02-ux/wireframes/sprint-1b/03-authenticatie-*.html.
 * Compositiepatroon succes/tussenstaat, hergebruikt van Orderbevestiging — geen
 * nieuw component (zie wireframe-commentaar bij schermen #5/#6).
 */
export function StatusScreen({
  icon,
  variant = "solid",
  title,
  children,
  actions,
}: {
  icon: ReactNode;
  variant?: "solid" | "envelope";
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="border border-wf-400 bg-white px-6 py-11 text-center sm:px-10">
      <div
        className={cn(
          "mx-auto mb-[18px] flex h-14 w-14 items-center justify-center rounded-full text-2xl",
          variant === "envelope" ? "border-2 border-wf-800 bg-white text-wf-800" : "bg-wf-900 text-white",
        )}
      >
        {icon}
      </div>
      <h1 className="mb-2.5 text-xl font-bold text-wf-900">{title}</h1>
      {children && (
        <div className="mx-auto mb-[22px] max-w-[340px] text-[13px] leading-relaxed text-wf-600">
          {children}
        </div>
      )}
      {actions}
    </div>
  );
}
