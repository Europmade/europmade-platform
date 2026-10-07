import { classifyImportRows, mapRole, mapSalesModel } from "../import-rules"

describe("prospectimport", () => {
  const existing = [
    { company_name: "ABC GmbH", emails: ["maria@abc.eu"] },
  ]

  it("importeert alleen nieuwe regels en overschrijft niets", () => {
    const rows = classifyImportRows(
      [
        {
          company_name: "Noord BV",
          contact_name: "Jan",
          email: "jan@noord.nl",
          website: "",
          category: "",
          role: "Merk",
          sales_model: "Direct aan consument",
        },
        {
          company_name: "ABC GmbH",
          contact_name: "Maria",
          email: "maria@abc.eu",
          website: "",
          category: "",
          role: "",
          sales_model: "",
        },
        {
          company_name: "ABC",
          contact_name: "Piet",
          email: "piet@abc.eu",
          website: "",
          category: "",
          role: "",
          sales_model: "",
        },
        {
          company_name: "",
          contact_name: "",
          email: "fout",
          website: "",
          category: "",
          role: "",
          sales_model: "",
        },
      ],
      existing
    )
    expect(rows.map((row) => row.message)).toEqual([
      "Nieuw",
      "Bestaat al",
      "Mogelijke dubbele",
      "Kan niet worden geïmporteerd",
    ])
    expect(rows[0]?.sales_model_token).toBe("direct_to_consumer")
    expect(rows[0]?.role_token).toBe("brand")
    expect(rows.filter((row) => row.verdict === "new")).toHaveLength(1)
  })

  it("herkent Nederlandse rol- en verkoopmodellen", () => {
    expect(mapRole("Distributeur")).toBe("distributor")
    expect(mapSalesModel("Alleen via resellers")).toBe("reseller_only")
    expect(mapSalesModel("Beide")).toBe("mixed")
    expect(mapSalesModel("Merk zoekt partners")).toBe("brand_seeking_partners")
  })
})