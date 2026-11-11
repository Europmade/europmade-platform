import { readFileSync } from "node:fs"
import { join } from "node:path"
import { categorySpecificFieldsForNames } from "../category-attributes"
import { suggestVariantAxesForCategory } from "../../../api/store/product-cloud/variant-axes"
import {
  applyShoeMaatToAxes,
  canonicalizeShoeMaat,
  presentEuSize,
  presentVariantSize,
  ukSizeForEu,
} from "../shoe-sizes"

describe("European shoe sizes", () => {
  it("keeps EU 40 and EU 41 as different sizes and does not estimate a gap", () => {
    expect(ukSizeForEu("dames", "40")).toBe("6.5")
    expect(ukSizeForEu("dames", "41")).toBe("7.5")
    expect(ukSizeForEu("dames", "40")).not.toBe(ukSizeForEu("dames", "41"))
    expect(ukSizeForEu("dames", "40.5")).toBeNull()
    expect(ukSizeForEu("dames", "40.0")).toBeNull()
    expect(ukSizeForEu("heren", "38")).toBeNull()
    expect(ukSizeForEu("kinderen", "40")).toBeNull()
  })

  it("uses a different table for women, men and children", () => {
    expect(ukSizeForEu("dames", "41")).toBe("7.5")
    expect(ukSizeForEu("heren", "41")).toBe("7")
    expect(ukSizeForEu("kinderen", "24")).toBe("7")
    expect(ukSizeForEu("kinderen", "23")).toBe("6")
    expect(ukSizeForEu(null, "40")).toBeNull()
  })

  it("keeps the same EU size in Dutch and French wording", () => {
    const dutch = presentEuSize("EU 40", ["Damesschoenen"])
    const french = presentEuSize("EU 40", ["Damesschoenen"])
    expect(dutch).toEqual(french)
    expect(dutch).toEqual({ eu: "40", uk: "6.5", label: "EU 40 · UK 6.5" })
    expect(presentEuSize("40", ["Damesschoenen"])?.eu).toBe("40")
  })

  it("stores the EU number and rejects clothing sizes on shoes", () => {
    expect(canonicalizeShoeMaat("EU 40", ["Herenschoenen"])).toEqual({
      ok: true,
      value: "40",
    })
    expect(canonicalizeShoeMaat("M", ["Damesschoenen"]).ok).toBe(false)
    expect(canonicalizeShoeMaat("XL", ["Kinderschoenen"]).ok).toBe(false)
    expect(canonicalizeShoeMaat("M", ["Kleding"])).toEqual({ ok: true, unchanged: true })
    const axes = applyShoeMaatToAxes(
      [
        { axis: "Maat", value: "EU 41" },
        { axis: "Kleur", value: "Zwart" },
      ],
      ["Herenschoenen"]
    )
    expect(axes).toEqual({
      ok: true,
      axes: [
        { axis: "Maat", value: "41" },
        { axis: "Kleur", value: "Zwart" },
      ],
    })
  })

  it("shows the same label to seller, admin and storefront data", () => {
    const names = ["Damesschoenen"]
    const label = presentVariantSize({
      variantType: "Maat",
      variantValue: "40",
      categoryNames: names,
    })
    expect(label).toBe("EU 40 · UK 6.5")
    expect(
      presentVariantSize({
        variantType: "Uitvoering",
        variantValue: "Standaard",
        categoryNames: ["Tuin"],
      })
    ).toBe("Uitvoering: Standaard")
  })

  it("keeps EU size as a product specification and does not suggest variant axes", () => {
    expect(categorySpecificFieldsForNames(["Damesschoenen"]).find((f) => f.code === "maat")?.option_values).toEqual(
      expect.arrayContaining(["40", "41"])
    )
    expect(categorySpecificFieldsForNames(["Mode"]).find((f) => f.code === "maat")?.option_values).toEqual([
      "XS",
      "S",
      "M",
      "L",
      "XL",
    ])
    expect(suggestVariantAxesForCategory("Damesschoenen")).toEqual([])
    expect(suggestVariantAxesForCategory("Kleding")).toEqual([])
  })

  it("does not expose commercial variant management in seller, admin or the storefront", () => {
    const root = join(__dirname, "../../../../../..")
    const seller = readFileSync(
      join(root, "apps/web/app/seller/products/[id]/page.tsx"),
      "utf8"
    )
    const admin = readFileSync(
      join(root, "apps/admin/components/product-cloud/admin-wizard-shell.tsx"),
      "utf8"
    )
    const storefront = readFileSync(
      join(root, "apps/web/app/_lib/storefront-catalog.ts"),
      "utf8"
    )
    expect(seller).not.toContain("SellerVariantsPanel")
    expect(admin).not.toContain("Varianten:")
    expect(storefront).toContain("sizeVariants: []")
  })
})
