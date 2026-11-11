import { headerMatchKey } from "../import-table"
import { COLUMN_ALIASES } from "../import-columns"

function resolveColumn(header: string): string | null {
  const key = headerMatchKey(header)
  for (const [col, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some((a) => headerMatchKey(a) === key)) return col
  }
  return null
}

describe("localized import headers", () => {
  it("maps EN/DE/FR visible headers to technical columns", () => {
    expect(resolveColumn("Product name (Required)")).toBe("title")
    expect(resolveColumn("Level 1 (Required)")).toBe("category")
    expect(resolveColumn("Brand (Required)")).toBe("brand")
    expect(resolveColumn("Produktname (Pflicht)")).toBe("title")
    expect(resolveColumn("Nom du produit (Obligatoire)")).toBe("title")
    expect(resolveColumn("Value 1 (Optional)")).toBe("spec_value_1")
    expect(resolveColumn("Waarde 1 (Optioneel)")).toBe("spec_value_1")
  })
})
