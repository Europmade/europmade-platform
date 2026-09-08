"use client"

export function CmsStatusBadge({
  published,
  extra,
}: {
  published: boolean
  extra?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        published
          ? "bg-emerald-50 text-emerald-800"
          : "bg-amber-50 text-amber-800"
      }`}
    >
      {published ? "Gepubliceerd" : "Concept"}
      {extra ? ` · ${extra}` : ""}
    </span>
  )
}

export function CmsPreviewFrame({
  viewport,
  children,
}: {
  viewport: "desktop" | "mobile"
  children: React.ReactNode
}) {
  const width = viewport === "mobile" ? 390 : 1160
  return (
    <div className="overflow-auto rounded-xl border border-wf-200 bg-wf-100 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-wf-500">
        {viewport === "mobile" ? "Mobiel" : "Desktop"} · indicatieve preview,
        geen volledige storefront (geen header, productcarrousels of live ads)
      </p>
      <div
        className="mx-auto origin-top bg-white shadow-sm"
        style={{
          width,
          maxWidth: "100%",
          transform: viewport === "desktop" ? "scale(0.72)" : "none",
          transformOrigin: "top center",
        }}
      >
        {children}
      </div>
    </div>
  )
}
