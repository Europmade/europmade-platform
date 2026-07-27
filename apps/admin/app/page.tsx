export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {/* Logo-placeholder — consistent met .logo-ph uit alle bevroren wireframes */}
      <div
        className="h-6 w-[130px] rounded bg-wf-300"
        role="img"
        aria-label="EuropMade logo (placeholder)"
      />

      <h1 className="text-xl font-bold text-wf-900">Dashboard</h1>

      <p className="max-w-sm text-sm text-wf-600">
        Deze omgeving bevat nog geen functionaliteit — de marketplace-modules worden hier verder opgebouwd.
      </p>
    </main>
  );
}
