/**
 * Focused Flow Template (CMP-001, minimale variant): uitsluitend logo,
 * gecentreerd, geen zoekbalk/navigatie — vastgesteld bij de Authenticatie-flow
 * (docs/07-design-system/components.md, CMP-001).
 *
 * children-type bewust breed gehouden i.v.m. Next.js layout typecheck +
 * React 19 @types dual-package conflict in monorepo.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
        <div className="w-full max-w-[520px]">{children}</div>
      </main>
    </div>
  );
}
