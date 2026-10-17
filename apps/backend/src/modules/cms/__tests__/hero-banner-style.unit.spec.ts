import {
  EUROPMADE_BLUE,
  heroCtaInlineStyle,
  heroCtaPreset,
  legacyHeroCtaStyle,
  parseHeroCtaStyle,
  parseHeroTextStyle,
} from "@europmade/utils"

describe("homepage hero banner styles", () => {
  it("keeps the current title and subtitle when no new colours are stored", () => {
    expect(parseHeroTextStyle(undefined, "black", "title")).toEqual({
      preset: "black",
      color: "#151515",
    })
    expect(parseHeroTextStyle(undefined, "black", "subtitle")).toEqual({
      preset: "custom",
      color: "#666666",
    })
  })

  it("accepts white, black and a custom title colour", () => {
    expect(parseHeroTextStyle({ preset: "white" }, "black", "title").color).toBe(
      "#ffffff"
    )
    expect(parseHeroTextStyle({ preset: "black" }, "white", "title").color).toBe(
      "#151515"
    )
    expect(
      parseHeroTextStyle({ preset: "custom", color: "#123abc" }, "black", "title")
        .color
    ).toBe("#123abc")
    expect(
      parseHeroTextStyle({ preset: "custom", color: "red" }, "black", "subtitle")
        .color
    ).toBe("#666666")
  })

  it("gives each button its own preset", () => {
    expect(heroCtaPreset("white")).toMatchObject({
      background: "#ffffff",
      text: EUROPMADE_BLUE,
      transparent: false,
    })
    expect(heroCtaPreset("transparent")).toMatchObject({
      background: "transparent",
      text: "#ffffff",
      border: "#ffffff",
      borderWidth: 1,
      transparent: true,
    })
    expect(heroCtaPreset("black")).toMatchObject({
      background: "#151515",
      text: "#ffffff",
      transparent: false,
    })
  })

  it("keeps the current buttons when a page has no per-button style", () => {
    expect(legacyHeroCtaStyle("primary", "black").preset).toBe("black")
    expect(legacyHeroCtaStyle("secondary", "black")).toMatchObject({
      background: "#ffffff",
      text: "#2c2c2c",
      border: "#cccccc",
      borderWidth: 1,
      transparent: false,
    })
    expect(parseHeroCtaStyle(undefined, "primary", "black")).toEqual(
      legacyHeroCtaStyle("primary", "black")
    )
  })

  it("stores a manual button separately from the other button", () => {
    const primary = parseHeroCtaStyle(
      {
        preset: "custom",
        background: "#112233",
        text: "#abcdef",
        border: "#445566",
        borderWidth: 3,
        radius: 12,
        transparent: false,
      },
      "primary",
      "black"
    )
    const secondary = parseHeroCtaStyle(
      { preset: "transparent" },
      "secondary",
      "black"
    )
    expect(primary).toMatchObject({
      background: "#112233",
      text: "#abcdef",
      borderWidth: 3,
      radius: 12,
    })
    expect(secondary.transparent).toBe(true)
    expect(secondary.text).toBe("#ffffff")
    expect(heroCtaInlineStyle(secondary).backgroundColor).toBe("transparent")
  })
})
