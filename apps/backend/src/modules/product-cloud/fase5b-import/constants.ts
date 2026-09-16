/** Fase 5B demo import — seller and scope constants. */
export const FASE5B_SELECTIE_SELLER_ID = "sell_01M1BJCJ85X7E4B85XS08KB1G4"
export const FASE5B_LEGACY_SELLER_ID = "sell_01M1BJCEPC81BKC9FQJCX1Q9P1"

export const FASE5B_SHEET_PRODUCTS = "03_Productonderzoek"
export const FASE5B_SHEET_IMAGES = "05_Afbeeldingen"
export const FASE5B_SHEET_CONTENT = "06_Content"

export const FASE5B_DEFAULT_TEST_PRODUCTS = [
  "EM-0002",
  "EM-0001",
  "EM-0003",
  "EM-0015",
  "EM-0030",
  "EM-0038",
  "EM-0004",
  "EM-0016",
  "EM-0005",
  "EM-0095",
  "EM-0066",
  "EM-0176",
] as const

/** Sport & Outdoor product with remapped category (Fietstassen). */
export const FASE5B_SPORT_MAPPING_TEST_EM = "EM-0176"

/** UAT import batch — base list + Sport & Outdoor remapping test product. */
export const FASE5B_UAT_PRODUCTS = [
  "EM-0001",
  "EM-0002",
  "EM-0003",
  "EM-0004",
  "EM-0005",
  "EM-0015",
  "EM-0016",
  "EM-0030",
  "EM-0038",
  "EM-0095",
  "EM-0066",
  "EM-0258",
] as const

/** Demo UAT offer defaults (clearly non-production). */
export const FASE5B_UAT_DEMO_PRICE_EUR = 99.99
export const FASE5B_UAT_DEMO_STOCK = 25
export const FASE5B_UAT_DEMO_REGION = "NL"

export const FASE5B_MAX_MEDIA_BYTES = 3 * 1024 * 1024
export const FASE5B_ALLOWED_MEDIA_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
])
