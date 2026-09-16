/** Shared labels for Admin Advertising (existing campaign keys only). */

export const AD_STATUS_COLORS: Record<string, string> = {
  draft: "outline",
  pending_review: "warning",
  approved: "success",
  scheduled: "info",
  active: "success",
  completed: "secondary",
  rejected: "destructive",
  cancelled: "secondary",
}

export const AD_STATUS_LABELS: Record<string, string> = {
  draft: "Concept",
  pending_review: "In beoordeling",
  approved: "Goedgekeurd",
  scheduled: "Gepland",
  active: "Actief",
  completed: "Afgerond",
  rejected: "Afgewezen",
  cancelled: "Geannuleerd",
}

const CTA_LABELS: Record<string, string> = {
  view_product: "Bekijk product",
  more_info: "Meer informatie",
  discover: "Ontdek het product",
  view_now: "Nu bekijken",
  view_offer: "Bekijk aanbieding",
}

const DESIGN_META: Record<
  string,
  { label: string; bgStyle: string; text: string }
> = {
  design_1: {
    label: "EuropMade Classic",
    bgStyle:
      "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    text: "text-white",
  },
  design_2: {
    label: "Fresh Green",
    bgStyle:
      "linear-gradient(135deg, #0d5c3e 0%, #1a8a5c 60%, #27ae60 100%)",
    text: "text-white",
  },
  design_3: {
    label: "Warm Sunset",
    bgStyle:
      "linear-gradient(135deg, #c94b22 0%, #e67e22 50%, #f1c40f 100%)",
    text: "text-white",
  },
  design_4: {
    label: "Clean White",
    bgStyle:
      "linear-gradient(135deg, #ffffff 0%, #f5f6fa 50%, #ecf0f1 100%)",
    text: "text-gray-900",
  },
  design_5: {
    label: "Royal Blue",
    bgStyle:
      "linear-gradient(135deg, #1e3a5f 0%, #2980b9 60%, #3498db 100%)",
    text: "text-white",
  },
}

export function placementLabel(p: string): string {
  if (p === "homepage") return "Homepage"
  if (p === "category") return "Categorie"
  if (p === "search") return "Zoekresultaat"
  return p || "Niet beschikbaar"
}

export function ctaLabel(key: string | null | undefined): string {
  if (!key) return "Niet beschikbaar"
  return CTA_LABELS[key] ?? key
}

export function designLabel(key: string | null | undefined): string {
  if (!key) return "Niet beschikbaar"
  return DESIGN_META[key]?.label ?? key
}

export function designStyle(key: string | null | undefined): {
  bgStyle: string
  text: string
} | null {
  if (!key || !DESIGN_META[key]) return null
  return { bgStyle: DESIGN_META[key].bgStyle, text: DESIGN_META[key].text }
}

export function formatAdDate(iso: string | null | undefined): string {
  if (!iso) return "Niet beschikbaar"
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return "Niet beschikbaar"
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatAdDateTime(iso: string | null | undefined): string {
  if (!iso) return "Niet beschikbaar"
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return "Niet beschikbaar"
  return d.toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function displayOrNa(value: string | null | undefined): string {
  const v = typeof value === "string" ? value.trim() : ""
  return v || "Niet beschikbaar"
}
