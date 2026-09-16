import {
  resolveFase5bIdentifier,
} from "../fase5b-import/identifier-resolve"
import { decideFase5bImport } from "../fase5b-import/verification-rules"
import {
  loadCategoryMappingFile,
  resolveCategoryMapping,
} from "../fase5b-import/category-map"
import { buildMediaPlan } from "../fase5b-import/media-plan"
import { resolve } from "node:path"

const CATEGORY_MAP = resolve(
  __dirname,
  "../../../../../../scripts/fase5b-category-mapping.json"
)

describe("fase5b identifier resolve", () => {
  it("prefers GTIN when present", () => {
    const r = resolveFase5bIdentifier({
      em_product_id: "EM-0001",
      ean_gtin: "8712345678901",
      mpn: "ABC-123",
    })
    expect(r.source).toBe("gtin")
    expect(r.identifier_type).toBe("GTIN")
    expect(r.country_scope).toBeNull()
  })

  it("uses MPN when EAN is not a valid GTIN", () => {
    const r = resolveFase5bIdentifier({
      em_product_id: "EM-0001",
      ean_gtin: "1519",
      mpn: "COMfortel-D-600",
    })
    expect(r.source).toBe("mpn")
    expect(r.identifier_type).toBe("MPN")
  })

  it("uses MPN when no EAN", () => {
    const r = resolveFase5bIdentifier({
      em_product_id: "EM-0066",
      ean_gtin: "",
      mpn: "FAB-99",
    })
    expect(r.source).toBe("mpn")
    expect(r.identifier_type).toBe("MPN")
    expect(r.identifier_value).toBe("FAB-99")
  })

  it("uses IMPORT_REF when neither EAN nor MPN", () => {
    const r = resolveFase5bIdentifier({
      em_product_id: "EM-0066",
      ean_gtin: "",
      mpn: "",
    })
    expect(r.source).toBe("import_ref")
    expect(r.identifier_type).toBe("IMPORT_REF")
    expect(r.identifier_value).toBe("EM-0066")
    expect(r.country_scope).toBe("FASE5B_DEMO")
  })

  it("never stores EM-xxxx as MPN", () => {
    const r = resolveFase5bIdentifier({
      em_product_id: "EM-0005",
      ean_gtin: "",
      mpn: "",
    })
    expect(r.identifier_type).not.toBe("MPN")
  })
})

describe("fase5b verification rules", () => {
  it("skips REJECTED", () => {
    const d = decideFase5bImport("REJECTED")
    expect(d.import).toBe(false)
    expect(d.skip_reason).toMatch(/REJECTED/)
  })

  it("imports VERIFIED as Concept with paused offer", () => {
    const d = decideFase5bImport("VERIFIED")
    expect(d.import).toBe(true)
    expect(d.publication_status).toBe("Concept")
    expect(d.offer_policy).toBe("paused")
  })

  it("imports PENDING without active sales", () => {
    const d = decideFase5bImport("PENDING")
    expect(d.import).toBe(true)
    expect(d.offer_policy).toBe("none")
  })
})

describe("fase5b category mapping", () => {
  const mapping = loadCategoryMappingFile(CATEGORY_MAP)

  it("exact match Elektronica", () => {
    const r = resolveCategoryMapping(mapping, "Elektronica", "Audio")
    expect(r.category_name).toBe("Elektronica")
    expect(r.category_id).toBe("pcgy_01KYSAP66YNXE2XRSXETRZHWQR")
  })

  it("remaps Sport & Outdoor Fietstassen (EM-0176)", () => {
    const r = resolveCategoryMapping(
      mapping,
      "Sport & Outdoor",
      "Fietstassen"
    )
    expect(r.category_name).toBe("Outdoor")
    expect(r.category_id).toBe("pcgy_01KZTTCN14W8EP0HN8SQHBA0SK")
  })
})

describe("fase5b media plan", () => {
  it("rejects upload:// URLs", () => {
    const plan = buildMediaPlan("EM-0001", [
      {
        em_product_id: "EM-0001",
        afbeeldingstype: "Hoofdafbeelding",
        bron_url: "",
        afbeelding_url: "upload://local/file.jpg",
        geselecteerd: true,
        kwaliteit: "",
        opmerking: "",
      },
    ])
    expect(plan.valid_https_count).toBe(0)
    expect(plan.items[0]?.status).toBe("skipped_upload_protocol")
  })

  it("accepts https URLs", () => {
    const plan = buildMediaPlan("EM-0002", [
      {
        em_product_id: "EM-0002",
        afbeeldingstype: "Hoofdafbeelding",
        bron_url: "",
        afbeelding_url: "https://example.com/img.jpg",
        geselecteerd: true,
        kwaliteit: "",
        opmerking: "",
      },
    ])
    expect(plan.valid_https_count).toBe(1)
    expect(plan.items[0]?.status).toBe("would_upload")
  })
})
