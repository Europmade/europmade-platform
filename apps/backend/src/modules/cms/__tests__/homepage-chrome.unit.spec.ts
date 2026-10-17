import {
  DEFAULT_CMS_HEADER,
  HEADER_NAVY,
  HEADER_WHITE,
  HOMEPAGE_CONTENT_GUTTER,
  SECTION_TITLE_COLOR,
  cmsThemeToCss,
  defaultCmsTheme,
  headerWithBackground,
  parseCmsHeader,
  parseCmsTheme,
  parseSectionTitleStyle,
} from "@europmade/utils"

describe("homepage chrome", () => {
  it("uses one shared content gutter", () => {
    expect(HOMEPAGE_CONTENT_GUTTER).toBe("px-4 tablet:px-8")
  })

  it("defaults section titles to #10396B and keeps the responsive size", () => {
    expect(parseSectionTitleStyle({})).toEqual({
      color: SECTION_TITLE_COLOR,
      fontSize: null,
    })
    expect(SECTION_TITLE_COLOR).toBe("#10396B")
    expect(
      parseSectionTitleStyle({ titleColor: "#051e36", titleSize: 22 })
    ).toEqual({ color: "#051e36", fontSize: 22 })
    expect(parseSectionTitleStyle({ titleSize: 8 }).fontSize).toBe(12)
    expect(parseSectionTitleStyle({ titleSize: 80 }).fontSize).toBe(40)
    expect(parseSectionTitleStyle({ titleColor: "navy" }).color).toBe(
      "#10396B"
    )
  })

  it("defaults a dark header to white ink and keeps a light header readable", () => {
    const fresh = parseCmsHeader({})
    expect(fresh.backgroundColor).toBe(HEADER_NAVY)
    expect(fresh.textColor).toBe(HEADER_WHITE)
    expect(fresh.categoryColor).toBe(HEADER_WHITE)
    expect(fresh.localeColor).toBe(HEADER_WHITE)
    expect(fresh.currencyColor).toBe(HEADER_WHITE)
    expect(fresh.iconColor).toBe(HEADER_WHITE)
    expect(fresh.searchBackground).toBe(HEADER_WHITE)
    expect(fresh.searchText).toBe(HEADER_NAVY)

    const light = parseCmsHeader({ backgroundColor: "#ffffff" })
    expect(light.backgroundColor).toBe("#ffffff")
    expect(light.textColor).toBe("#2c2c2c")
    expect(light.iconColor).toBe("#4a4a4a")
    expect(light.categoryColor).toBe("#4a4a4a")
    expect(light.searchBorder).toBe("#4a4a4a")
    expect(light.searchText).not.toBe(HEADER_WHITE)

    const explicit = parseCmsHeader({
      backgroundColor: "#ffffff",
      textColor: "#112233",
      iconColor: "#abcdef",
      searchBorder: "#cccccc",
    })
    expect(explicit.textColor).toBe("#112233")
    expect(explicit.iconColor).toBe("#abcdef")
    expect(explicit.searchBorder).toBe("#cccccc")
  })

  it("round-trips stored header and title settings", () => {
    const stored = {
      ...defaultCmsTheme(),
      header: {
        ...DEFAULT_CMS_HEADER,
        backgroundColor: "#10396B",
        logoHeight: 40,
        textColor: "#ffffff",
        navFontSize: 15,
        categoryColor: "#f4f4f4",
        categoryFontSize: 14,
        searchBackground: "#ffffff",
        searchText: "#10396B",
        searchBorder: "#ffffff",
        searchHeight: 44,
        localeColor: "#ffffff",
        localeFontSize: 12,
        currencyColor: "#eeeeee",
        currencyFontSize: 12,
        iconColor: "#ffffff",
        iconSize: 26,
      },
    }
    expect(parseCmsTheme(stored).header).toEqual(stored.header)
    expect(
      parseSectionTitleStyle({ titleColor: "#10396B", titleSize: 18 })
    ).toEqual({ color: "#10396B", fontSize: 18 })
  })

  it("switches only default ink when the editor background changes", () => {
    const light = parseCmsHeader({
      backgroundColor: "#ffffff",
      textColor: "#112233",
    })
    const dark = headerWithBackground(light, "#10396B")
    expect(dark.textColor).toBe("#112233")
    expect(dark.iconColor).toBe(HEADER_WHITE)
    expect(dark.categoryColor).toBe(HEADER_WHITE)
    expect(dark.searchText).toBe(light.searchText)
  })

  it("sets section padding vertically only", () => {
    const css = cmsThemeToCss(defaultCmsTheme())
    expect(css).not.toContain('[class*="px-4 py-3.5"]')
    expect(css).toContain(".em-home-section")
    expect(css).not.toMatch(/\.em-home-section\s*\{[^}]*padding-left/)
    expect(css).toContain("padding-top:")
    expect(css).toContain("padding-bottom:")
  })
})
