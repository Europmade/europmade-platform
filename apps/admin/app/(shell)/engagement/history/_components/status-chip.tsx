"use client"

import { eventStatusLabel } from "../../../../../lib/engagement-admin-api"

export function HistoryStatus({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-wf-300 bg-white px-2 py-0.5 text-[11px] font-medium text-wf-900">
      <span className="h-1.5 w-1.5 rounded-full bg-wf-800" aria-hidden />
      {eventStatusLabel(status)}
    </span>
  )
}
