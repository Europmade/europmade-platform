import {
  detectPngHasAlpha,
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
})
