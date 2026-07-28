import type { ReactNode } from "react";

/**
 * `.page` + `.auth-card` uit docs/02-ux/wireframes/sprint-1b/03-authenticatie-*.html.
 * Geen nieuw component — dezelfde witte kaart die elk formulierscherm van de
 * Authenticatie-flow gebruikt.
 */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="border border-wf-400 bg-white px-6 py-9 sm:px-10">
      <h1 className="mb-1.5 text-center text-xl font-bold text-wf-900">{title}</h1>
      {subtitle && <p className="mb-6 text-center text-xs text-wf-600">{subtitle}</p>}
      {children}
    </div>
  );
}
