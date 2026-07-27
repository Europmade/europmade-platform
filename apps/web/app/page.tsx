export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      {/* Logo-placeholder — consistent met .logo-ph uit alle bevroren wireframes */}
      <div
        className="h-8 w-[160px] rounded bg-wf-300"
        role="img"
        aria-label="EuropMade logo (placeholder)"
      />

      <h1 className="text-2xl font-bold text-wf-900 sm:text-3xl">
        Kwaliteitsproducten uit Europa
      </h1>

      <p className="max-w-md text-sm leading-relaxed text-wf-600">
        Het meest transparante, betrouwbare en eerlijke marketplace-platform van Europa,
        voor producten die daadwerkelijk in Europa zijn geproduceerd.
      </p>
    </main>
  );
}
