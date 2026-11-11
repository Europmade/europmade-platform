import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { normalizeLanguageCode } from "../../../../modules/product-cloud/languages"

function readQueryString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value
  if (Array.isArray(value) && typeof value[0] === "string" && value[0]) {
    return value[0]
  }
  return null
}

/**
 * Public/store read of Product Cloud categories (slug + attribute codes).
 * Optional `locale` resolves category/attribute display names via pc_translation
 * with source fallback (ADR-0038). No Commerce data.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const slug = readQueryString(req.query.slug)
  const localeRaw = readQueryString(req.query.locale)
  const locale = localeRaw ? normalizeLanguageCode(localeRaw) : null

  const categories = slug
    ? await productCloud.listCategories({ slug }, { take: 2000 })
    : await productCloud.listCategories({}, { take: 2000, order: { name: "ASC" } })

  const enriched: Array<{
    id: string
    name: string
    slug: string | null
    parent_category_id: string | null
    locale: string | null
    name_resolution: {
      source: "source" | "translation" | "missing"
      translation_status: string | null
    }
    attributes: Array<{
      id: string
      code: string | null
      name: string
      data_type: string
      unit: string | null
      is_required: boolean
      is_filterable: boolean
      is_comparable: boolean
      sort_order: number
      option_values: string | null
      name_resolution?: {
        source: "source" | "translation" | "missing"
        translation_status: string | null
      }
    }>
  }> = []

  for (const category of categories) {
    let displayName = category.name
    let nameResolution: {
      source: "source" | "translation" | "missing"
      translation_status: string | null
    } = { source: "source", translation_status: null }

    if (locale) {
      const resolved = await productCloud.resolveLocalizedEntityFields({
        entity_type: "category",
        entity_id: category.id,
        locale,
        source_language_code: null,
        source_fields: { name: category.name },
      })
      const nameField = resolved.find((r) => r.field_name === "name")
      if (nameField) {
        displayName = nameField.value || category.name
        nameResolution = {
          source: nameField.source,
          translation_status: nameField.translation_status,
        }
      }
    }

    const attribute_definitions =
      await productCloud.listAttributeDefinitions(
        { category_id: category.id },
        { order: { sort_order: "ASC" } }
      )

    const attributes = []
    for (const a of attribute_definitions) {
      let attrName = a.name
      let attrNameResolution:
        | {
            source: "source" | "translation" | "missing"
            translation_status: string | null
          }
        | undefined

      if (locale) {
        const resolved = await productCloud.resolveLocalizedEntityFields({
          entity_type: "attribute_definition",
          entity_id: a.id,
          locale,
          source_fields: { name: a.name },
        })
        const nameField = resolved.find((r) => r.field_name === "name")
        if (nameField) {
          attrName = nameField.value || a.name
          attrNameResolution = {
            source: nameField.source,
            translation_status: nameField.translation_status,
          }
        }
      }

      attributes.push({
        id: a.id,
        code: a.code,
        name: attrName,
        data_type: a.data_type,
        unit: a.unit,
        is_required: a.is_required,
        is_filterable: a.is_filterable,
        is_comparable: a.is_comparable,
        sort_order: a.sort_order,
        option_values: a.option_values,
        ...(attrNameResolution
          ? { name_resolution: attrNameResolution }
          : {}),
      })
    }

    enriched.push({
      id: category.id,
      name: displayName,
      slug: category.slug,
      parent_category_id: category.parent_category_id ?? null,
      locale,
      name_resolution: nameResolution,
      attributes,
    })
  }

  res.status(200).json({ categories: enriched })
}
