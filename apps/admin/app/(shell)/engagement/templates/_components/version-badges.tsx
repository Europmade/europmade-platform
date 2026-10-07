import { versionBadges } from "../../../../../lib/engagement-admin-api"

export function VersionBadges({
  version,
}: {
  version: {
    approval_status: string
    activation_status: string
    used_at: string | null
  }
}) {
  const labels = versionBadges(version)
  if (labels.length === 0) return null
  return (
    <span className="inline-flex flex-wrap gap-1">
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full border border-wf-300 bg-wf-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-wf-700"
        >
          {label}
        </span>
      ))}
    </span>
  )
}
