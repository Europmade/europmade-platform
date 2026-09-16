import {
  detectPngHasAlpha,
  mediaAcceptAttribute,
  normalizeMediaMimeType,
  validateMedia,
} from "../validate"
import { getMediaRequirements } from "../requirements"
import {
  parseVideoEmbedUrl,
  isVideoEmbedReference,
} from "../video-embed"
import {
  resolveOptimizedImageUrl,
  parseProductMediaMetadata,
} from "../media-metadata"

describe("media validation — primary vs gallery", () => {
  it("allows JPG as primary source upload", () => {
    const result = validateMedia({
      placement: "product_main",
      mimeType: "image/jpeg",
      sizeBytes: 500_000,
      width: 1000,
      height: 1000,
      hasAlpha: false,
    })
    expect(result.ok).toBe(true)
  })

  it("allows PNG with transparency as primary", () => {
    const result = validateMedia({
      placement: "product_main",
      mimeType: "image/png",
      sizeBytes: 500_000,
      width: 1000,
      height: 1000,
      hasAlpha: true,
    })
    expect(result.ok).toBe(true)
  })

  it("allows WebP as primary", () => {
    const result = validateMedia({
      placement: "product_main",
      mimeType: "image/webp",
      sizeBytes: 400_000,
      width: 800,
      height: 800,
      hasAlpha: null,
    })
    expect(result.ok).toBe(true)
  })

  it("allows AVIF as primary", () => {
    const result = validateMedia({
      placement: "product_main",
      mimeType: "image/avif",
      sizeBytes: 300_000,
      width: 900,
      height: 900,
      hasAlpha: null,
    })
    expect(result.ok).toBe(true)
  })

  it("accepts secondary JPG with full background", () => {
    const result = validateMedia({
      placement: "product_other",
      mimeType: "image/jpeg",
      sizeBytes: 2_000_000,
      width: 1200,
      height: 1200,
      hasAlpha: false,
    })
    expect(result.ok).toBe(true)
  })

  it("does not reject secondary lifestyle photo for missing transparency", () => {
    const result = validateMedia({
      placement: "product_other",
      mimeType: "image/png",
      sizeBytes: 1_500_000,
      width: 1000,
      height: 1000,
      hasAlpha: false,
    })
    expect(result.ok).toBe(true)
  })

  it("cms banner with background is valid", () => {
    const result = validateMedia({
      placement: "cms_banner",
      mimeType: "image/jpeg",
      sizeBytes: 1_000_000,
      width: 2400,
      height: 600,
      hasAlpha: false,
    })
    expect(result.ok).toBe(true)
  })

  it("accepts action banner below old 4:1 cms_banner floor", () => {
    const result = validateMedia({
      placement: "cms_action_banner",
      mimeType: "image/jpeg",
      sizeBytes: 400_000,
      width: 1000,
      height: 400,
      hasAlpha: false,
    })
    expect(result.ok).toBe(true)
  })

  it("rejects undersized action banner", () => {
    const result = validateMedia({
      placement: "cms_action_banner",
      mimeType: "image/jpeg",
      sizeBytes: 20_000,
      width: 400,
      height: 100,
      hasAlpha: false,
    })
    expect(result.ok).toBe(false)
  })
})

describe("detectPngHasAlpha", () => {
  it("detects alpha in RGBA PNG IHDR", () => {
    const buf = Buffer.alloc(26)
    buf.set([137, 80, 78, 71, 13, 10, 26, 10])
    buf.write("IHDR", 12)
    buf[25] = 6
    expect(detectPngHasAlpha(buf)).toBe(true)
  })
})

describe("video embed", () => {
  it("parses YouTube watch URL", () => {
    const parsed = parseVideoEmbedUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    )
    expect(parsed?.provider).toBe("youtube")
    expect(parsed?.video_id).toBe("dQw4w9WgXcQ")
    expect(parsed?.embed_url).toContain("youtube.com/embed/")
  })

  it("parses Vimeo URL", () => {
    const parsed = parseVideoEmbedUrl("https://vimeo.com/123456789")
    expect(parsed?.provider).toBe("vimeo")
    expect(parsed?.video_id).toBe("123456789")
  })

  it("rejects invalid external video URL", () => {
    expect(parseVideoEmbedUrl("https://evil.example/video")).toBeNull()
    expect(isVideoEmbedReference("not-a-url")).toBe(false)
  })
})

describe("optimized image resolver", () => {
  it("prefers variant over original", () => {
    const url = resolveOptimizedImageUrl(
      "/static/original.jpg",
      {
        variants: {
          webp: { "800": "/static/original-800.webp" },
        },
      },
      "http://localhost:9000"
    )
    expect(url).toBe("http://localhost:9000/static/original-800.webp")
  })

  it("falls back to storage_reference for legacy media", () => {
    const url = resolveOptimizedImageUrl(
      "/static/legacy.jpg",
      null,
      "http://localhost:9000"
    )
    expect(url).toBe("http://localhost:9000/static/legacy.jpg")
  })

  it("parses metadata safely", () => {
    expect(parseProductMediaMetadata({ has_alpha: true })?.has_alpha).toBe(true)
    expect(parseProductMediaMetadata(null)).toBeNull()
  })
})

describe("media validation — MIME normalization", () => {
  it("accepts image/jpg alias for brand_story_photo", () => {
    const result = validateMedia({
      placement: "brand_story_photo",
      mimeType: "image/jpg",
      sizeBytes: 400_000,
      fileName: "merk.jpg",
    })
    expect(result.ok).toBe(true)
  })

  it("accepts empty MIME with .jpeg extension", () => {
    const result = validateMedia({
      placement: "homepage_hero",
      mimeType: "",
      sizeBytes: 400_000,
      fileName: "hero.jpeg",
    })
    expect(result.ok).toBe(true)
  })

  it("accepts application/octet-stream with .webp extension", () => {
    const result = validateMedia({
      placement: "brand_story_photo",
      mimeType: "application/octet-stream",
      sizeBytes: 200_000,
      fileName: "logo.webp",
    })
    expect(result.ok).toBe(true)
  })

  it("rejects unsupported types with clear JPEG/JPG wording", () => {
    const result = validateMedia({
      placement: "brand_story_photo",
      mimeType: "image/gif",
      sizeBytes: 100_000,
      fileName: "x.gif",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain("JPEG/JPG")
      expect(result.message).toContain("PNG")
      expect(result.message).toContain("WEBP")
    }
  })
})

describe("media accept helpers", () => {
  it("builds accept with mime + extensions", () => {
    const accept = mediaAcceptAttribute(["image/jpeg", "image/png", "image/webp"])
    expect(accept).toContain("image/jpeg")
    expect(accept).toContain(".jpg")
    expect(accept).toContain(".jpeg")
    expect(accept).toContain(".png")
    expect(accept).toContain(".webp")
  })

  it("normalizes image/pjpeg", () => {
    expect(normalizeMediaMimeType("image/pjpeg", "x.jpg")).toBe("image/jpeg")
  })
})

describe("media requirements", () => {
  it("primary uses capable transparency policy", () => {
    expect(getMediaRequirements("product_main").transparency).toBe("capable")
    expect(getMediaRequirements("product_main").mimeTypes).toContain(
      "image/jpeg"
    )
  })

  it("gallery allows background", () => {
    expect(getMediaRequirements("product_other").transparency).toBe("allowed")
  })

  it("rejects JPEG and SVG for commercial nav icons", () => {
    const jpeg = validateMedia({
      placement: "commercial_nav_icon",
      mimeType: "image/jpeg",
      sizeBytes: 20_000,
      width: 128,
      height: 128,
      fileName: "icon.jpg",
    })
    expect(jpeg.ok).toBe(false)

    const svg = validateMedia({
      placement: "commercial_nav_icon",
      mimeType: "image/svg+xml",
      sizeBytes: 2_000,
      fileName: "icon.svg",
    })
    expect(svg.ok).toBe(false)
  })

  it("rejects oversized commercial nav icons", () => {
    const tooHeavy = validateMedia({
      placement: "commercial_nav_icon",
      mimeType: "image/png",
      sizeBytes: 501 * 1024,
      width: 128,
      height: 128,
      fileName: "icon.png",
    })
    expect(tooHeavy.ok).toBe(false)
    if (!tooHeavy.ok) expect(tooHeavy.message).toContain("500 KB")

    const tooWide = validateMedia({
      placement: "commercial_nav_icon",
      mimeType: "image/png",
      sizeBytes: 20_000,
      width: 300,
      height: 300,
      fileName: "icon.png",
    })
    expect(tooWide.ok).toBe(false)
  })

  it("allows non-square commercial nav icons within bounds", () => {
    const result = validateMedia({
      placement: "commercial_nav_icon",
      mimeType: "image/webp",
      sizeBytes: 40_000,
      width: 128,
      height: 96,
      fileName: "icon.webp",
    })
    expect(result.ok).toBe(true)
  })
})
