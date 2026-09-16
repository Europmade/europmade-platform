import {
  detectPngHasAlpha,
  validateMedia,
  getMediaRequirements,
  parseVideoEmbedUrl,
  isVideoEmbedReference,
  resolveOptimizedImageUrl,
  parseProductMediaMetadata,
} from "@europmade/utils"

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
      width: 1200,
      height: 1200,
      hasAlpha: false,
    })
    expect(result.ok).toBe(true)
  })

  it("allows banner with background (cms_banner rules)", () => {
    const result = validateMedia({
      placement: "cms_banner",
      mimeType: "image/jpeg",
      sizeBytes: 800_000,
      width: 2400,
      height: 600,
      hasAlpha: false,
    })
    expect(result.ok).toBe(true)
  })

  it("allows action banner that would fail cms_banner 4:1 floor", () => {
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
})

describe("PNG alpha detection", () => {
  it("detects alpha in minimal RGBA PNG", () => {
    const buf = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    )
    expect(detectPngHasAlpha(buf)).toBe(true)
  })
})

describe("video embed parsing", () => {
  it("parses YouTube watch URL", () => {
    const parsed = parseVideoEmbedUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    )
    expect(parsed).not.toBeNull()
    expect(parsed?.provider).toBe("youtube")
    expect(parsed?.video_id).toBe("dQw4w9WgXcQ")
  })

  it("parses YouTube short URL", () => {
    const parsed = parseVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")
    expect(parsed?.provider).toBe("youtube")
    expect(parsed?.video_id).toBe("dQw4w9WgXcQ")
  })

  it("parses Vimeo URL", () => {
    const parsed = parseVideoEmbedUrl("https://vimeo.com/123456789")
    expect(parsed?.provider).toBe("vimeo")
    expect(parsed?.video_id).toBe("123456789")
  })

  it("rejects invalid external video URL", () => {
    expect(parseVideoEmbedUrl("https://example.com/video.mp4")).toBeNull()
    expect(isVideoEmbedReference("https://example.com/video.mp4")).toBe(false)
  })
})

describe("optimized image resolver", () => {
  it("prefers optimized variant over raw storage reference", () => {
    const url = resolveOptimizedImageUrl(
      "/static/original.jpg",
      {
        variants: {
          webp: { "800": "/static/product-800.webp" },
        },
      },
      "http://localhost:9000"
    )
    expect(url).toBe("http://localhost:9000/static/product-800.webp")
  })

  it("falls back to storage_reference for legacy media", () => {
    const url = resolveOptimizedImageUrl(
      "/static/legacy.jpg",
      null,
      "http://localhost:9000"
    )
    expect(url).toBe("http://localhost:9000/static/legacy.jpg")
  })

  it("builds responsive srcset from metadata variants", () => {
    const meta = parseProductMediaMetadata({
      variants: {
        webp: {
          "400": "/static/a-400.webp",
          "800": "/static/a-800.webp",
        },
      },
    })
    expect(meta?.variants?.webp?.["400"]).toBe("/static/a-400.webp")
  })
})

describe("media requirements", () => {
  it("marks primary as transparency capable not required", () => {
    expect(getMediaRequirements("product_main").transparency).toBe("capable")
    expect(getMediaRequirements("product_other").transparency).toBe("allowed")
  })

  it("supports AVIF upload for gallery images", () => {
    expect(getMediaRequirements("product_other").mimeTypes).toContain(
      "image/avif"
    )
  })

  it("rejects JPEG and SVG for commercial nav icons", () => {
    expect(
      validateMedia({
        placement: "commercial_nav_icon",
        mimeType: "image/jpeg",
        sizeBytes: 20_000,
        width: 128,
        height: 128,
        fileName: "icon.jpg",
      }).ok
    ).toBe(false)
    expect(
      validateMedia({
        placement: "commercial_nav_icon",
        mimeType: "image/svg+xml",
        sizeBytes: 2_000,
        fileName: "icon.svg",
      }).ok
    ).toBe(false)
  })

  it("rejects oversized commercial nav icons and allows contained non-square", () => {
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

    expect(
      validateMedia({
        placement: "commercial_nav_icon",
        mimeType: "image/png",
        sizeBytes: 20_000,
        width: 300,
        height: 300,
        fileName: "icon.png",
      }).ok
    ).toBe(false)

    expect(
      validateMedia({
        placement: "commercial_nav_icon",
        mimeType: "image/webp",
        sizeBytes: 40_000,
        width: 128,
        height: 96,
        fileName: "icon.webp",
      }).ok
    ).toBe(true)
  })
})
