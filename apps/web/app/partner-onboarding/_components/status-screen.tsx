import type { ReactNode } from "react";
import { cn } from "@europmade/utils";

/**
 * `.status-block` uit docs/02-ux/wireframes/sprint-1b/04-partner-onboarding-*.html.
 * Compositiepatroon (geen nieuw component, geen CMP-id) — zelfde patroon als
 * `app/(auth)/_components/status-screen.tsx` (Orderbevestiging/Authenticatie),
 * hier lokaal gekopieerd conform de bestaande per-route-groep-conventie
 * (`_components`), niet gerefactored naar `packages/ui` om wijzigingen aan
 * S3-01-05-bestanden buiten dit ticket te vermijden.
 */
export function StatusScreen({
  icon,
  variant = "solid",
  badge,
  title,
  children,
  actions,
}: {
  icon: ReactNode;
  variant?: "solid" | "pending" | "rejected";
  badge: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="border border-wf-400 bg-white px-6 py-11 text-center sm:px-10">
      <div
        className={cn(
          "mx-auto mb-[18px] flex h-14 w-14 items-center justify-center rounded-full text-2xl",
          variant === "solid" && "bg-wf-900 text-white",
          variant === "pending" && "border-2 border-wf-800 bg-white text-wf-800",
          variant === "rejected" && "border-2 border-wf-700 bg-white text-wf-700",
        )}
      >
        {icon}
      </div>
      <span className="mb-3.5 inline-block rounded-full border border-wf-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-wf-700">
        {badge}
      </span>
      <h1 className="mb-2.5 text-xl font-bold text-wf-900">{title}</h1>
      {children && (
        <div className="mx-auto mb-[22px] max-w-[400px] text-[13px] leading-relaxed text-wf-600">
          {children}
        </div>
      )}
      {actions}
    </div>
  );
}
