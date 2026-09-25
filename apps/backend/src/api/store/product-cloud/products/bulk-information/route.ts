import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../resolve-seller"
import { sellerCanDirectEditCatalog } from "../../catalog-edit-guard"

/**
 * Safe bulk attribute update — GPSR / reusable compliance fields only.
 * Brand/category structural changes are intentionally NOT supported here.
 */
const BULK_ALLOWED_CODES = new Set([
  "gpsr_manufacturer_name",
  "gpsr_manufacturer_address",
  "gpsr_manufacturer_postal_city",
  "gpsr_manufacturer_country",
  "gpsr_manufacturer_email",
  "gpsr_eu_responsible_name",
  "gpsr_eu_responsible_address",
  "gpsr_eu_responsible_postal_city",
  "gpsr_eu_responsible_country",
  "gpsr_eu_responsible_contact",
  "gpsr_safety_warnings",
])

const GPSR_LABELS: Record<string, string> = {
  gpsr_manufacturer_name: "Fabrikant / verantwoordelijke fabrikant",
  gpsr_manufacturer_address: "Fabrikantadres",
  gpsr_manufacturer_postal_city: "Fabrikant postcode + plaats",
  gpsr_manufacturer_country: "Fabrikant land",
  gpsr_manufacturer_email: "Fabrikant e-mail",
  gpsr_eu_responsible_name: "EU-verantwoordelijke — naam",
  gpsr_eu_responsible_address: "EU-verantwoordelijke — adres",
  gpsr_eu_responsible_postal_city: "EU-verantwoordelijke — postcode + plaats",
  gpsr_eu_responsible_country: "EU-verantwoordelijke — land",
  gpsr_eu_responsible_contact: "EU-verantwoordelijke — contact",
  gpsr_safety_warnings: "Veiligheidswaarschuwingen",
}

const StoreBulkProductInformationBody = z.object({
  product_ids: z.array(z.string().min(1)).min(1).max(100),
  attributes: z
    .array(
      z.object({
        code: z.string().min(1),
        value: z.string(),
      })
    )
    .min(1),
  confirm: z.literal(true),
  reason: z.string().max(500).optional(),
})

type Body = z.infer<typeof StoreBulkProductInformationBody>

/**
 * POST /store/product-cloud/products/bulk-information
 * Applies allowlisted attribute codes to selected own products.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const parsed = StoreBulkProductInformationBody.safeParse(req.body)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Bulkactie vereist product_ids, attributes en confirm=true. Alleen GPSR/compliance-codes zijn toegestaan."
    )
  }
  const body: Body = parsed.data

  for (const attr of body.attributes) {
    if (!BULK_ALLOWED_CODES.has(attr.code)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Veld '${attr.code}' is niet toegestaan in bulk. Ondersteund: EU Compliance (GPSR) velden.`
      )
    }
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const results: Array<{
    product_id: string
    ok: boolean
    updated: number
    error?: string
  }> = []

  for (const productId of body.product_ids) {
    try {
      const product = await productCloud.retrieveProduct(productId)
      const access = await sellerCanDirectEditCatalog(req.scope, product, seller)
      if (!access.allowed) {
        results.push({
          product_id: productId,
          ok: false,
          updated: 0,
          error: "Geen catalogusrechten",
        })
        continue
      }

      const versions = await productCloud.listProductVersions({
        product_id: productId,
      })
      const working = [...versions]
        .filter(
          (v: { publication_status: string }) =>
            v.publication_status === "Concept" ||
            v.publication_status === "In review" ||
            v.publication_status === "Gepubliceerd"
        )
        .sort(
          (a: { version_number: number }, b: { version_number: number }) =>
            b.version_number - a.version_number
        )[0]
      if (!working) {
        results.push({
          product_id: productId,
          ok: false,
          updated: 0,
          error: "Geen versie",
        })
        continue
      }

      const links = await productCloud.listProductCategories({
        product_id: productId,
      })
      const categoryIds = links.map(
        (l: { category_id: string }) => l.category_id
      )
      const defs: Array<{ id: string; code: string | null }> = []
      for (const catId of categoryIds) {
        const rows = await productCloud.listAttributeDefinitions({
          category_id: catId,
        })
        defs.push(...rows)
      }
      const defByCode = new Map(
        defs
          .filter((d) => d.code)
          .map((d) => [d.code as string, d.id])
      )

      let updated = 0
      for (const attr of body.attributes) {
        const trimmed = attr.value.trim()
        if (!trimmed) continue
        const defId = defByCode.get(attr.code)
        if (!defId) continue

        const existingVals = await productCloud.listAttributeValues({
          product_version_id: working.id,
          attribute_definition_id: defId,
        })
        const oldRaw =
          existingVals[0] != null
            ? String((existingVals[0] as { value: string }).value ?? "")
            : ""

        await productCloud.setVersionAttributeValues({
          product_version_id: working.id,
          values: [{ attribute_definition_id: defId, value: trimmed }],
        })
        await productCloud.createProductFieldChanges({
          product_id: productId,
          product_version_id: working.id,
          seller_id: seller.id,
          actor_customer_id: req.auth_context.actor_id,
          field_code: attr.code,
          field_label: GPSR_LABELS[attr.code] || attr.code,
          old_value: oldRaw || null,
          new_value: trimmed,
          status: "current",
          reason: body.reason || "bulk-information",
        })
        updated += 1
      }

      results.push({ product_id: productId, ok: true, updated })
    } catch (err) {
      results.push({
        product_id: productId,
        ok: false,
        updated: 0,
        error: err instanceof Error ? err.message : "Fout",
      })
    }
  }

  res.json({
    results,
    supported_codes: [...BULK_ALLOWED_CODES],
    note: "Bulk ondersteunt alleen EU Compliance (GPSR) velden. Merk/categorie/structuurvelden zijn uitgesloten.",
  })
}
