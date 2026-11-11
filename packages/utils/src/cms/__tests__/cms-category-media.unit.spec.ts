import {
  createDefaultCategoryCmsDocument,
  mergeCategoryCmsEditorWrite,
  validateCategoryCmsDocument,
} from "../../cms-category-document"
import {
  cmsAssetAltTextForStorage,
  collectCategoryCmsAssetIds,
  readCmsAssetAltText,
  resolveCategoryCmsAssetUrls,
} from "../category-cms-media"

const loc = (nl: string) => ({ nl, en: "", de: "", fr: "" })

describe("cms asset alt text and caption", () => {
  it("reads a flat alt_text value as alt and leaves caption empty", () => {
    expect(readCmsAssetAltText({ nl: "Stoel", en: "Chair", de: "", fr: "" })).toEqual({
      alt: { nl: "Stoel", en: "Chair", de: "", fr: "" },
      caption: { nl: "", en: "", de: "", fr: "" },
    })
    expect(readCmsAssetAltText(null).alt.nl).toBe("")
  })

  it("splits a legacy nested alt_text value and writes only alt back", () => {
    const legacy = {
      alt: { nl: "Stoel", en: "", de: "", fr: "" },
      caption: { nl: "Eiken fineer", en: "", de: "", fr: "" },
    }
    expect(readCmsAssetAltText(legacy)).toEqual({
      alt: { nl: "Stoel", en: "", de: "", fr: "" },
      caption: { nl: "Eiken fineer", en: "", de: "", fr: "" },
    })
    const stored = cmsAssetAltTextForStorage(legacy.alt)
    expect(stored).toEqual({ nl: "Stoel", en: "", de: "", fr: "" })
    expect(Object.keys(stored)).toEqual(["nl", "en", "de", "fr"])
    expect(stored).not.toHaveProperty("caption")
  })
})

describe("category cms asset urls", () => {
  it("uses the current asset url and keeps a url-only image", () => {
    const doc = {
      schema_version: 2,
      blocks: [
        {
          type: "hero",
          image_asset_id: "cmsas_desktop",
          image_url: "http://localhost:9000/static/old-desktop.png",
          mobile_image_url: "http://localhost:9000/static/only-mobile.png",
        },
        {
          type: "subcategory_tiles",
          tile_images: [
            { slug: "keuken", image: { url: "http://localhost:9000/static/tile.png" } },
            {
              slug: "was-droog",
              image: {
                asset_id: "cmsas_missing",
                url: "http://localhost:9000/static/kept.png",
              },
            },
          ],
        },
        {
          type: "buying_guide",
          sections: [
            {
              id: "s1",
              image: { asset_id: "cmsas_guide", url: "http://localhost:9000/static/old-guide.png" },
            },
          ],
        },
      ],
    }
    const resolved = resolveCategoryCmsAssetUrls(doc, {
      cmsas_desktop: "http://localhost:9000/static/new-desktop.png",
      cmsas_guide: "http://localhost:9000/static/new-guide.png",
    })
    const hero = resolved.blocks[0] as { image_url: string; mobile_image_url: string }
    const tiles = resolved.blocks[1] as {
      tile_images: Array<{ image: { url: string } }>
    }
    const guide = resolved.blocks[2] as { sections: Array<{ image: { url: string } }> }
    expect(hero.image_url).toBe("http://localhost:9000/static/new-desktop.png")
    expect(hero.mobile_image_url).toBe("http://localhost:9000/static/only-mobile.png")
    expect(tiles.tile_images[0]?.image.url).toBe("http://localhost:9000/static/tile.png")
    expect(tiles.tile_images[1]?.image.url).toBe("http://localhost:9000/static/kept.png")
    expect(guide.sections[0]?.image.url).toBe("http://localhost:9000/static/new-guide.png")
    expect(doc.blocks[0]).toMatchObject({
      image_url: "http://localhost:9000/static/old-desktop.png",
    })
    expect(collectCategoryCmsAssetIds(doc)).toEqual(["cmsas_desktop", "cmsas_missing", "cmsas_guide"])
  })
})

describe("mobile hero frame", () => {
  it("keeps a separate mobile crop and still accepts a hero without one", () => {
    const base = createDefaultCategoryCmsDocument("level_1", { slug: "huishouden" })
    expect(validateCategoryCmsDocument(base, { slug: "huishouden", expectedProfile: "level_1" })).toEqual([])
    const hero = base.blocks.find((block) => block.type === "hero")
    if (!hero || hero.type !== "hero") throw new Error("hero missing")
    hero.mobile_image_url = "http://localhost:9000/static/mobile.png"
    hero.mobile_image_asset_id = "cmsas_mobile"
    hero.mobile_image_frame = {
      ratio: "1:1",
      fit: "contain",
      position_x: "left",
      position_y: "top",
    }
    const saved = mergeCategoryCmsEditorWrite(base, base, { slug: "huishouden", profile: "level_1" })
    const savedHero = saved.blocks.find((block) => block.type === "hero")
    expect(savedHero && savedHero.type === "hero" ? savedHero.mobile_image_frame : null).toEqual({
      ratio: "1:1",
      fit: "contain",
      position_x: "left",
      position_y: "top",
    })
    const cleared = mergeCategoryCmsEditorWrite(
      saved,
      {
        ...saved,
        blocks: saved.blocks.map((block) =>
          block.type === "hero" ? { ...block, mobile_image_frame: null, title: loc("Huishouden") } : block
        ),
      },
      { slug: "huishouden", profile: "level_1" }
    )
    const clearedHero = cleared.blocks.find((block) => block.type === "hero")
    expect(clearedHero && clearedHero.type === "hero" ? clearedHero.mobile_image_frame : "missing").toBeNull()
    expect(validateCategoryCmsDocument(saved, { slug: "huishouden", expectedProfile: "level_1" })).toEqual([])
  })
})
