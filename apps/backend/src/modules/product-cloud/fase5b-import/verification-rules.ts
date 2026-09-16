export type ClaudeVerificationStatus =
  | "VERIFIED"
  | "PARTIALLY VERIFIED"
  | "PENDING"
  | "REJECTED"

export type Fase5bImportDecision = {
  import: boolean
  skip_reason?: string
  publication_status: "Concept"
  lifecycle_status: "Concept gecontroleerd" | "Retailer Created" | "Gearchiveerd"
  offer_policy: "none" | "paused"
}

export function decideFase5bImport(
  verification: string
): Fase5bImportDecision {
  const status = verification.trim().toUpperCase()

  if (status === "REJECTED") {
    return {
      import: false,
      skip_reason: "REJECTED — niet importeren",
      publication_status: "Concept",
      lifecycle_status: "Gearchiveerd",
      offer_policy: "none",
    }
  }

  if (status === "VERIFIED" || status === "PARTIALLY VERIFIED") {
    return {
      import: true,
      publication_status: "Concept",
      lifecycle_status: "Concept gecontroleerd",
      offer_policy: "paused",
    }
  }

  if (status === "PENDING") {
    return {
      import: true,
      publication_status: "Concept",
      lifecycle_status: "Retailer Created",
      offer_policy: "none",
    }
  }

  return {
    import: false,
    skip_reason: `Onbekende verification-status: ${verification}`,
    publication_status: "Concept",
    lifecycle_status: "Concept gecontroleerd",
    offer_policy: "none",
  }
}
