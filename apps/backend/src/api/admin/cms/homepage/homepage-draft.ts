/** Live storefront row. Store API reads only this key when published. */
export const LIVE_HOMEPAGE_KEY = "default"

/** Editor working copy. Never read by the storefront. */
export const DRAFT_HOMEPAGE_KEY = "default-draft"

export type HomepageSavePlan = {
  /** Row that receives the submitted document. */
  writeKey: typeof LIVE_HOMEPAGE_KEY | typeof DRAFT_HOMEPAGE_KEY
  /** Published flag stored on the written row. */
  writePublished: boolean
  /** Concept saves must not update or unpublish the live row. */
  touchLive: boolean
  /** Publish replaces the live page and drops the working copy. */
  deleteDraft: boolean
}

/**
 * Concept writes a separate row. Only an explicit publish replaces the live homepage.
 */
export function planHomepageSave(publish: boolean): HomepageSavePlan {
  if (publish) {
    return {
      writeKey: LIVE_HOMEPAGE_KEY,
      writePublished: true,
      touchLive: true,
      deleteDraft: true,
    }
  }
  return {
    writeKey: DRAFT_HOMEPAGE_KEY,
    writePublished: false,
    touchLive: false,
    deleteDraft: false,
  }
}

/**
 * The editor opens the concept when one exists, and the badge follows the live row.
 */
export function resolveHomepageEditor<T>(input: {
  live: T | null
  draft: T | null
  isLivePublished: boolean
}): { editor: T | null; published: boolean; hasDraft: boolean } {
  return {
    editor: input.draft ?? input.live,
    published: input.isLivePublished,
    hasDraft: input.draft != null,
  }
}
