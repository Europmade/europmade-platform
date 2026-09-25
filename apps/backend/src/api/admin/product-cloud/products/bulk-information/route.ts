import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"

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
  gpsr_manufacturer_name: "Fabrikant naam",
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

const BodySchema = z.object({
  product_ids: z.array(z.string().trim().min(1)).min(1).max(200),
  attributes: z
    .array(
      z.object({
        code: z.string().min(1),
        value: z.string(),
      })
    )
    .optional(),
  dry_run: z.boolean().optional(),
  preview_only: z.boolean().optional(),
  reason: z.string().trim().max(500).optional(),
})

async function productTitle(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<string | null> {
  try {
    const versions = (await productCloud.listProductVersions(
      { product_id: productId },
      { order: { version_number: "DESC" }, take: 3 }
    )) as Array<{ title?: string; publication_status?: string }>
    const working =
      versions.find((v) => v.publication_status === "Gepubliceerd") ||
      versions[0]
    return working?.title?.trim() || null
  } catch {
    return null
  }
}

/**
 * POST /admin/product-cloud/products/bulk-information
 * Atomic GPSR/EU Compliance attribute updates (preview / dry_run / apply).
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const parsed = BodySchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ongeldige bulk EU Compliance-actie."
    )
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const uniqueIds = [...new Set(parsed.data.product_ids)]

  if (parsed.data.preview_only) {
    const products = []
    for (const productId of uniqueIds) {
      products.push({
        product_id: productId,
        title: await productTitle(productCloud, productId),
        current_display: "EU Compliance-velden (per product)",
      })
    }
    res.json({
      preview_only: true,
      count: products.length,
      products,
      allowed_codes: [...BULK_ALLOWED_CODES].map((code) => ({
        code,
        label: GPSR_LABELS[code] || code,
      })),
    })
    return
  }

  const attributes = parsed.data.attributes || []
  if (!attributes.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Vul minimaal één EU Compliance-veld in."
    )
  }
  for (const attr of attributes) {
    if (!BULK_ALLOWED_CODES.has(attr.code)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Veld '${attr.code}' is niet toegestaan in bulk.`
      )
    }
  }

  const newDisplay = attributes
    .map((a) => `${GPSR_LABELS[a.code] || a.code}: ${a.value || "—"}`)
    .join("; ")

  const evaluated = []
  for (const productId of uniqueIds) {
    try {
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
        evaluated.push({
          product_id: productId,
          title: await productTitle(productCloud, productId),
          current_display: "—",
          new_display: newDisplay,
          valid: false,
          error: "Geen productversie beschikbaar",
          working_version_id: null as string | null,
          defByCode: new Map<string, string>(),
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

      const missing = attributes
        .filter((a) => !defByCode.has(a.code))
        .map((a) => a.code)
      evaluated.push({
        product_id: productId,
        title: await productTitle(productCloud, productId),
        current_display: missing.length
          ? `Ontbrekende attributen in schema: ${missing.join(", ")}`
          : "Huidige GPSR-waarden (worden overschreven)",
        new_display: newDisplay,
        valid: missing.length === 0,
        error:
          missing.length > 0
            ? `EU Compliance-velden ontbreken in productschema: ${missing.join(", ")}`
            : null,
        working_version_id: working.id as string,
        defByCode,
      })
    } catch (err) {
      evaluated.push({
        product_id: productId,
        title: null,
        current_display: "—",
        new_display: newDisplay,
        valid: false,
        error: err instanceof Error ? err.message : "Controle mislukt",
        working_version_id: null as string | null,
        defByCode: new Map<string, string>(),
      })
    }
  }

  const invalid = evaluated.filter((r) => !r.valid)
  const publicRows = evaluated.map(
    ({ defByCode: _d, working_version_id: _w, ...rest }) => rest
  )

  if (parsed.data.dry_run) {
    res.json({
      dry_run: true,
      all_valid: invalid.length === 0,
      count: evaluated.length,
      invalid_count: invalid.length,
      new_value: { attributes, label: newDisplay },
      products: publicRows,
      invalid_products: publicRows.filter((r) => !r.valid),
    })
    return
  }

  if (invalid.length > 0) {
    res.status(400).json({
      message:
        "Bulkactie geblokkeerd. Er zijn geen wijzigingen uitgevoerd.",
      all_valid: false,
      updated_count: 0,
      count: evaluated.length,
      invalid_count: invalid.length,
      products: publicRows,
      invalid_products: publicRows.filter((r) => !r.valid),
    })
    return
  }

  const applied: string[] = []
  try {
    for (const row of evaluated) {
      if (!row.working_version_id) continue
      for (const attr of attributes) {
        const defId = row.defByCode.get(attr.code)
        if (!defId) continue
        const existing = await productCloud.listAttributeValues({
          product_version_id: row.working_version_id,
          attribute_definition_id: defId,
        })
        const current = existing[0]
        if (current) {
          await productCloud.updateAttributeValues({
            id: current.id,
            value: attr.value,
          })
        } else {
          await productCloud.createAttributeValues({
            product_version_id: row.working_version_id,
            attribute_definition_id: defId,
            value: attr.value,
          })
        }
        await productCloud.createProductFieldChanges({
          product_id: row.product_id,
          product_version_id: row.working_version_id,
          seller_id: null,
          actor_customer_id: null,
          field_code: attr.code,
          field_label: GPSR_LABELS[attr.code] || attr.code,
          old_value: current?.value ?? null,
          new_value: attr.value,
          status: "approved",
          reason: parsed.data.reason || "Bulk EU Compliance (admin)",
        })
      }
      applied.push(row.product_id)
    }
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Bulk EU Compliance afgebroken na ${applied.length}/${uniqueIds.length}: ${
        err instanceof Error ? err.message : "fout"
      }`
    )
  }

  res.json({
    all_valid: true,
    updated_count: applied.length,
    count: uniqueIds.length,
    message: `${applied.length} product(en) bijgewerkt.`,
    products: publicRows,
  })
}
