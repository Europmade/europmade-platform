const keyFor = (productId: string) => `em-seller-product-draft:${productId}`

export type ProductDraftSnapshot = {
  offerDraft: unknown
  regularPriceDraft: string
  title: string
  description: string
}

export function saveProductDraftSnapshot(
  productId: string,
  snapshot: ProductDraftSnapshot
) {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.setItem(keyFor(productId), JSON.stringify(snapshot))
}

export function readProductDraftSnapshot(
  productId: string
): ProductDraftSnapshot | null {
  if (typeof sessionStorage === "undefined") return null
  const raw = sessionStorage.getItem(keyFor(productId))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ProductDraftSnapshot
    if (!parsed || typeof parsed !== "object") return null
    return parsed
  } catch {
    return null
  }
}

export function clearProductDraftSnapshot(productId: string) {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.removeItem(keyFor(productId))
}
