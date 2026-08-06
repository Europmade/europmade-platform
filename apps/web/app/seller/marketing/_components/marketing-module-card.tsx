import Link from "next/link"
import { Badge } from "@europmade/ui"
import type { MarketingModuleDefinition } from "../../_lib/marketing/module-registry"

export function MarketingModuleCard({
  module,
}: {
  module: MarketingModuleDefinition
}) {
  const unavailable = module.status !== "available" || !module.href
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-wf-900">{module.title}</h3>
        {unavailable ? (
          <Badge variant="outline">Nog niet beschikbaar</Badge>
        ) : (
          <Badge variant="solid">Beschikbaar</Badge>
        )}
      </div>
      <p className="mt-2 text-[11.5px] text-wf-600">{module.description}</p>
      {!unavailable ? (
        <span className="mt-3 inline-block text-[11px] font-semibold text-wf-800 underline">
          Openen →
        </span>
      ) : null}
    </>
  )

  if (unavailable || !module.href) {
    return (
      <div className="rounded-lg border border-wf-300 bg-white px-5 py-4">
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={module.href}
      className="block rounded-lg border border-wf-300 bg-white px-5 py-4 transition-colors hover:border-wf-500"
    >
      {inner}
    </Link>
  )
}
