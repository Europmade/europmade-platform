"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function EngagementVersionRedirectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  useEffect(() => {
    if (!id) return
    router.replace(`/engagement/templates/${id}`)
  }, [id, router])
  return <p className="text-xs text-wf-500">Bericht openen…</p>
}
