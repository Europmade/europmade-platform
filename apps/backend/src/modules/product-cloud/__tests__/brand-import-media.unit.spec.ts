import { ingestRemoteAsset } from "../brand-import-media"

describe("brand import media", () => {
  it("does not keep an external url when the download fails", async () => {
    const upload = jest.fn(async () => "/static/should-not-run.jpg")
    await expect(
      ingestRemoteAsset({
        url: "https://cdn.example.com/missing.jpg",
        role: "image",
        fetchFn: async () => new Response(null, { status: 404 }),
        upload,
      })
    ).rejects.toThrow(/niet bereikbaar/)
    expect(upload).not.toHaveBeenCalled()
  })

  it("copies a reachable image into own storage", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const result = await ingestRemoteAsset({
      url: "https://cdn.example.com/product.png",
      role: "image",
      fetchFn: async () =>
        new Response(png, {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
      upload: async () => "http://127.0.0.1:9000/static/brand-import.png",
    })
    expect(result.storage_reference).toBe("/static/brand-import.png")
    expect(result.storage_reference).not.toContain("cdn.example.com")
  })

  it("rejects a private url before fetching", async () => {
    const fetchFn = jest.fn()
    await expect(
      ingestRemoteAsset({
        url: "https://192.168.1.10/secret.jpg",
        role: "image",
        fetchFn: fetchFn as unknown as typeof fetch,
        upload: async () => "/static/x.jpg",
      })
    ).rejects.toThrow(/lokale|Interne/)
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
