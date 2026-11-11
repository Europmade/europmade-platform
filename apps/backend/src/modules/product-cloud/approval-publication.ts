/**
 * Admin approval is the publication moment.
 * A version that is already Gepubliceerd is left untouched.
 * A failed publish rolls the version back to In review.
 */

export function publicationAlreadyLive(status: string | null | undefined): boolean {
  return status === "Gepubliceerd"
}

/** Offer gaps block the sale. They do not block product approval. */
export const OFFER_PUBLICATION_REASONS = new Set([
  "Geen verkoopaanbod aanwezig",
  "Verkoopprijs invullen",
  "Voorraad instellen",
  "Levertijd/verzending instellen",
  "Verzendprofiel koppelen",
])

export function productPublicationBlockers(reasons: string[]): string[] {
  return reasons.filter((reason) => !OFFER_PUBLICATION_REASONS.has(reason))
}

export async function publishVersionAfterApproval<T>(input: {
  statusAfterApproval: string | null | undefined
  publish: () => Promise<T>
  revertToReview: () => Promise<void>
}): Promise<{ published: boolean; result?: T }> {
  if (publicationAlreadyLive(input.statusAfterApproval)) {
    return { published: false }
  }
  try {
    const result = await input.publish()
    return { published: true, result }
  } catch (err) {
    await input.revertToReview()
    throw err
  }
}
