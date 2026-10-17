/**
 * Centrale MEDIA_REQUIREMENTS — één bron voor uploadrichtlijnen.
 * Pixelwaarden alleen waar codebase/specs die vastleggen.
 */

import type { MediaPlacement, MediaRequirements } from "@europmade/types"

const MB = 1024 * 1024

export const MEDIA_REQUIREMENTS: Record<MediaPlacement, MediaRequirements> = {
  product_main: {
    placement: "product_main",
    label: "Product hoofdafbeelding",
    recommendedSize: null,
    minSize: null,
    maxSize: null,
    aspectRatio: "1:1",
    aspectRatioValue: 1,
    aspectRatioTolerance: 0.03,
    maxBytes: 10 * MB,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    transparency: "capable",
    notes:
      "Hoofdafbeelding — EuropMade optimaliseert automatisch. Transparantie wordt behouden wanneer de bron alpha heeft; JPG met achtergrond is toegestaan als bron.",
    enforceDimensions: false,
    enforceAspectRatio: true,
  },
  product_other: {
    placement: "product_other",
    label: "Overige productafbeelding",
    recommendedSize: null,
    minSize: null,
    maxSize: null,
    aspectRatio: "1:1",
    aspectRatioValue: 1,
    aspectRatioTolerance: 0.05,
    maxBytes: 10 * MB,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    transparency: "allowed",
    notes:
      "Product-, detail- en sfeerafbeeldingen. Een achtergrond is toegestaan.",
    enforceDimensions: false,
    enforceAspectRatio: true,
  },
  product_video: {
    placement: "product_video",
    label: "Productvideo",
    recommendedSize: null,
    minSize: null,
    maxSize: null,
    aspectRatio: null,
    aspectRatioValue: null,
    maxBytes: 50 * MB,
    mimeTypes: ["video/mp4", "video/webm"],
    maxVideoDurationSec: null,
    videoResolution: null,
    transparency: "n/a",
    notes:
      "MP4/WebM upload of YouTube/Vimeo-link. Geen eigen video-hosting.",
    enforceDimensions: false,
    enforceAspectRatio: false,
  },
  brand_logo: {
    placement: "brand_logo",
    label: "Merklogo",
    recommendedSize: { width: 1000, height: 1000 },
    minSize: { width: 1000, height: 1000 },
    maxSize: null,
    aspectRatio: "1:1",
    aspectRatioValue: 1,
    aspectRatioTolerance: 0.03,
    maxBytes: 5 * MB,
    mimeTypes: ["image/png", "image/svg+xml"],
    transparency: "recommended",
    notes: "Zelfde richtlijn als seller logo (seller settings).",
    enforceDimensions: true,
    enforceAspectRatio: true,
  },
  seller_logo: {
    placement: "seller_logo",
    label: "Seller logo",
    recommendedSize: { width: 1000, height: 1000 },
    minSize: { width: 1000, height: 1000 },
    maxSize: null,
    aspectRatio: "1:1",
    aspectRatioValue: 1,
    aspectRatioTolerance: 0.03,
    maxBytes: 5 * MB,
    mimeTypes: ["image/png", "image/svg+xml"],
    transparency: "recommended",
    notes: "Seller settings: 1000 × 1000 px, PNG of SVG, max. 5 MB.",
    enforceDimensions: true,
    enforceAspectRatio: true,
  },
  seller_storefront_banner: {
    placement: "seller_storefront_banner",
    label: "Seller storefront banner",
    recommendedSize: { width: 2400, height: 600 },
    minSize: { width: 2400, height: 600 },
    maxSize: null,
    aspectRatio: "4:1",
    aspectRatioValue: 4,
    aspectRatioTolerance: 0.05,
    maxBytes: 10 * MB,
    mimeTypes: ["image/png", "image/jpeg"],
    transparency: "allowed",
    notes: "Seller settings: 2400 × 600 px, PNG of JPG, max. 10 MB.",
    enforceDimensions: true,
    enforceAspectRatio: true,
  },
  cms_banner: {
    placement: "cms_banner",
    label: "CMS / redactionele banner",
    recommendedSize: { width: 2400, height: 600 },
    minSize: { width: 1200, height: 300 },
    maxSize: null,
    aspectRatio: "4:1",
    aspectRatioValue: 4,
    aspectRatioTolerance: 0.08,
    maxBytes: 10 * MB,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    transparency: "allowed",
    notes:
      "Gebaseerd op bestaande storefront-bannercreatives (2400×600). CMP-033 slots hebben vaste hoogte (~220px) en full-width — creative volgt 4:1.",
    enforceDimensions: true,
    enforceAspectRatio: true,
  },
  cms_action_banner: {
    placement: "cms_action_banner",
    label: "CMS actie-banner",
    recommendedSize: { width: 1600, height: 480 },
    minSize: { width: 800, height: 200 },
    maxSize: null,
    aspectRatio: null,
    aspectRatioValue: null,
    maxBytes: 10 * MB,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    transparency: "allowed",
    notes:
      "Hero op /acties/{slug} (object-cover, ~280px hoog). Aanbevolen 1600 × 480 px. Geen strikte 4:1-verhouding.",
    enforceDimensions: true,
    enforceAspectRatio: false,
  },
  cms_site_logo: {
    placement: "cms_site_logo",
    label: "Site-logo (header)",
    recommendedSize: { width: 480, height: 120 },
    minSize: null,
    maxSize: null,
    aspectRatio: null,
    aspectRatioValue: null,
    maxBytes: 2 * MB,
    mimeTypes: ["image/png", "image/svg+xml", "image/webp"],
    transparency: "recommended",
    notes:
      "Header-woordmerk/logo. Aanbevolen ~480 × 120 px (of SVG). PNG/SVG/WebP, transparante achtergrond aanbevolen. Wordt met object-contain geschaald (geen vervorming).",
    enforceDimensions: false,
    enforceAspectRatio: false,
  },
  campaign_logo: {
    placement: "campaign_logo",
    label: "Campagnelogo",
    recommendedSize: null,
    minSize: null,
    maxSize: null,
    aspectRatio: null,
    aspectRatioValue: null,
    maxBytes: 2 * MB,
    mimeTypes: ["image/png", "image/webp"],
    transparency: "recommended",
    notes:
      "Merklogo op een actiekaart. PNG of WebP met transparante achtergrond. Wordt met object-contain geschaald en niet bijgesneden.",
    enforceDimensions: false,
    enforceAspectRatio: false,
  },
  homepage_hero: {
    placement: "homepage_hero",
    label: "Homepage hero",
    recommendedSize: null,
    minSize: null,
    maxSize: null,
    aspectRatio: null,
    aspectRatioValue: null,
    maxBytes: 10 * MB,
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    transparency: "allowed",
    notes:
      "Geen vaste pixel-eisen in bestaande hero-CSS (composition placeholder). Creative type bepaalt of foto of graphic past.",
    enforceDimensions: false,
    enforceAspectRatio: false,
  },
  facility_photo: {
    placement: "facility_photo",
    label: "Productiefaciliteit",
    recommendedSize: null,
    minSize: null,
    maxSize: null,
    aspectRatio: null,
    aspectRatioValue: null,
    maxBytes: 10 * MB,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    transparency: "n/a",
    notes: "Normale fotografie toegestaan.",
    enforceDimensions: false,
    enforceAspectRatio: false,
  },
  brand_story_photo: {
    placement: "brand_story_photo",
    label: "Merkverhaal / fotografie",
    recommendedSize: null,
    minSize: null,
    maxSize: null,
    aspectRatio: null,
    aspectRatioValue: null,
    maxBytes: 10 * MB,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    transparency: "allowed",
    notes: "Normale fotografie toegestaan.",
    enforceDimensions: false,
    enforceAspectRatio: false,
  },
  partner_document: {
    placement: "partner_document",
    label: "Partnerdocument",
    recommendedSize: null,
    minSize: null,
    maxSize: null,
    aspectRatio: null,
    aspectRatioValue: null,
    maxBytes: 10 * MB,
    mimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    transparency: "n/a",
    notes: "Partner onboarding: PDF/JPG/PNG, max. 10 MB.",
    enforceDimensions: false,
    enforceAspectRatio: false,
  },
  commercial_nav_icon: {
    placement: "commercial_nav_icon",
    label: "Commercieel categorie-icoon",
    recommendedSize: { width: 256, height: 256 },
    minSize: { width: 64, height: 64 },
    maxSize: { width: 256, height: 256 },
    aspectRatio: "1:1",
    aspectRatioValue: 1,
    aspectRatioTolerance: 0.08,
    maxBytes: 500 * 1024,
    mimeTypes: ["image/png", "image/webp"],
    transparency: "recommended",
    notes:
      "Vierkant lijnicoon voor storefront-navigatie. PNG of WebP, 256 × 256 px aanbevolen. Het verloop vult het hele vierkant. Max. 500 KB. SVG is niet toegestaan (geen SVG-sanitizer). Niet-vierkante bestanden worden in een vierkant vlak geplaatst zonder uitrekken.",
    enforceDimensions: true,
    enforceAspectRatio: false,
  },
}

export function formatMediaMaxBytes(maxBytes: number): string {
  if (maxBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(maxBytes / 1024))} KB`
  }
  return `${Math.round(maxBytes / (1024 * 1024))} MB`
}

export function getMediaRequirements(placement: MediaPlacement): MediaRequirements {
  return MEDIA_REQUIREMENTS[placement]
}

export function formatMediaRequirementSummary(req: MediaRequirements): string {
  const parts: string[] = []
  if (req.recommendedSize) {
    parts.push(
      `Aanbevolen ${req.recommendedSize.width} × ${req.recommendedSize.height} px`
    )
  }
  if (req.aspectRatio) {
    parts.push(req.aspectRatio)
  }
  parts.push(`max. ${formatMediaMaxBytes(req.maxBytes)}`)
  const types = req.mimeTypes
    .map((m) => {
      if (m === "image/jpeg") return "JPEG/JPG"
      if (m === "image/png") return "PNG"
      if (m === "image/webp") return "WEBP"
      if (m === "image/avif") return "AVIF"
      if (m === "image/svg+xml") return "SVG"
      if (m === "application/pdf") return "PDF"
      if (m === "video/mp4") return "MP4"
      if (m === "video/webm") return "WebM"
      return m
    })
    .join(", ")
  parts.push(types)
  return parts.join(" · ")
}
