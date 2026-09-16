import { readFileSync } from "node:fs"
import { join } from "node:path"
import { transformSync } from "@swc/core"

const helperPath = join(
  process.cwd(),
  "../web/app/seller/_lib/product-link-proposal.ts"
)
const compiled = transformSync(readFileSync(helperPath, "utf8"), {
  filename: helperPath,
  jsc: {
    parser: { syntax: "typescript" },
    target: "es2022",
  },
  module: { type: "commonjs" },
})
const loaded = { exports: {} as Record<string, unknown> }
new Function("exports", "module", compiled.code as string)(
  loaded.exports,
  loaded
)

const {
  applyVisibleSelection,
  buildProductLinkProposalBody,
  canOpenProductLinkDialog,
  proposalBodyHasStatus,
  showProductLinkBulkAction,
  toggleSelectedId,
} = loaded.exports as {
  applyVisibleSelection: (
    current: Set<string>,
    visibleIds: string[],
    selectAll: boolean
  ) => Set<string>
  buildProductLinkProposalBody: (input: {
    name: string
    dimensions: string[]
    members: Array<{ product_id: string; values: Record<string, string> }>
    note?: string
  }) => Record<string, unknown>
  canOpenProductLinkDialog: (count: number) => boolean
  proposalBodyHasStatus: (body: Record<string, unknown>) => boolean
  showProductLinkBulkAction: (count: number) => boolean
  toggleSelectedId: (selection: Set<string>, id: string) => Set<string>
}

const pageSrc = readFileSync(
  join(process.cwd(), "../web/app/seller/products/page.tsx"),
  "utf8"
)
const apiSrc = readFileSync(
  join(process.cwd(), "../web/app/seller/_lib/product-cloud-api.ts"),
  "utf8"
)
const dialogSrc = readFileSync(
  join(
    process.cwd(),
    "../web/app/seller/products/_components/product-link-dialog.tsx"
  ),
  "utf8"
)

describe("seller product link bulk flow", () => {
  it("can select a product and multiple products", () => {
    let selection = new Set<string>()
    selection = toggleSelectedId(selection, "prod_A")
    expect(selection.has("prod_A")).toBe(true)
    selection = toggleSelectedId(selection, "prod_B")
    expect([...selection]).toEqual(["prod_A", "prod_B"])
  })

  it("selects and deselects the visible list", () => {
    const visible = ["prod_A", "prod_B", "prod_C"]
    const selected = applyVisibleSelection(new Set(), visible, true)
    expect([...selected]).toEqual(visible)
    const cleared = applyVisibleSelection(selected, visible, false)
    expect(cleared.size).toBe(0)
  })

  it("shows Producten koppelen when a selection exists", () => {
    expect(showProductLinkBulkAction(0)).toBe(false)
    expect(showProductLinkBulkAction(1)).toBe(true)
    expect(pageSrc).toContain("Producten koppelen")
    expect(pageSrc).toContain('type="checkbox"')
    expect(pageSrc).toContain("seller-select-all-visible")
  })

  it("requires at least two products to open the link dialog", () => {
    expect(canOpenProductLinkDialog(1)).toBe(false)
    expect(canOpenProductLinkDialog(2)).toBe(true)
  })

  it("builds a proposal with dimension values and no status", () => {
    const body = buildProductLinkProposalBody({
      name: "Kleurreeks",
      dimensions: ["Kleur"],
      members: [
        { product_id: "prod_A", values: { Kleur: "Zwart" } },
        { product_id: "prod_B", values: { Kleur: "Wit" } },
      ],
    })
    expect(body.dimensions).toEqual(["Kleur"])
    expect(body.members).toHaveLength(2)
    expect(proposalBodyHasStatus(body)).toBe(false)
    expect(JSON.stringify(body)).not.toMatch(/"status"\s*:/)
  })

  it("posts to the existing proposal API and keeps proposed server-side", () => {
    expect(apiSrc).toContain(
      "/store/product-cloud/product-link-groups/proposals"
    )
    expect(apiSrc).toContain("submitProductLinkGroupProposal")
    expect(dialogSrc).toContain("submitProductLinkGroupProposal")
    expect(dialogSrc).not.toContain("status: \"active\"")
    expect(pageSrc).toContain("Koppelvoorstellen")
    expect(pageSrc).not.toContain("/admin/product-cloud/product-link-groups")
  })

  it("keeps existing seller list actions and filters", () => {
    expect(pageSrc).toContain("listOwnProducts")
    expect(pageSrc).toContain("sellerProductHref")
    expect(pageSrc).toContain("plSearchPlaceholder")
    expect(pageSrc).toContain('filter === "all"')
    expect(pageSrc).toContain("sellerOfferHref")
  })
})
