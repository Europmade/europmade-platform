import type { ReactNode } from "react";

/**
 * Focused Flow Template (CMP-001, minimale variant) — zelfde principe als
 * `app/(auth)/layout.tsx`, hier met de bredere contentbreedte (~760px) van
 * `.page` in docs/02-ux/wireframes/sprint-1b/04-partner-onboarding-*.html
 * (breder dan de Authenticatie-kaart, die 520px is).
 */
export default function PartnerOnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-wf-100">
      <header
        role="banner"
        className="flex items-center justify-center border-b border-wf-300 bg-white py-4"
      >
        <div
          className="h-6 w-[130px] rounded bg-wf-300"
          role="img"
          aria-label="EuropMade logo (placeholder)"
        />
      </header>
      <main className="flex justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[760px]">{children}</div>
      </main>
    </div>
  );
}
