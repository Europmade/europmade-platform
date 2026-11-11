import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { parseImportPayload } from "../../../store/product-cloud/import-helpers"
import type { BrandCategoryChoice, BrandColumnLink } from "../../../../modules/product-cloud/brand-import"
import type { BrandImportRequest } from "./run"

type UploadRequest = AuthenticatedMedusaRequest & {
  file?: { buffer: Buffer; originalname?: string; mimetype?: string }
}

function jsonField<T>(value: unknown): T | undefined {
  if (typeof value !== "string" || !value.trim()) return value as T | undefined
  try {
    return JSON.parse(value) as T
  } catch {
    return undefined
  }
}

export function brandImportRequest(req: UploadRequest): BrandImportRequest {
  const body = (req.body || {}) as Record<string, unknown>
  const parsed = parseImportPayload({
    file: req.file,
    csv_text: typeof body.csv_text === "string" ? body.csv_text : undefined,
    headers: jsonField<string[]>(body.headers) || (Array.isArray(body.headers) ? (body.headers as string[]) : undefined),
    rows: jsonField<string[][]>(body.rows) || (Array.isArray(body.rows) ? (body.rows as string[][]) : undefined),
  })
  const flag = (value: unknown) => value === true || value === "true" || value === "1"
  return {
    headers: parsed.headers,
    rows: parsed.rows,
    source_key: String(body.source_key || "").trim(),
    file_name: req.file?.originalname || null,
    manual: jsonField<Record<string, string | null>>(body.mapping) || undefined,
    column_languages:
      jsonField<Record<string, string | null>>(body.column_languages) || undefined,
    manual_links: jsonField<BrandColumnLink[]>(body.manual_links) || undefined,
    source_language_code:
      typeof body.source_language_code === "string" ? body.source_language_code : null,
    language_confirmed: flag(body.language_confirmed),
    mapping_confirmed: flag(body.mapping_confirmed),
    brand_choices: jsonField<
      Record<string, { action: "use"; id: string } | { action: "create"; name: string }>
    >(body.brand_choices),
    category_decisions: jsonField<BrandCategoryChoice[]>(body.category_decisions),
    attribute_overrides:
      jsonField<Record<string, Record<string, string>>>(body.attribute_overrides) ||
      undefined,
    enqueue_translations: flag(body.enqueue_translations),
    save_profile: body.save_profile === undefined ? true : flag(body.save_profile),
    actor_id: req.auth_context?.actor_id || "admin",
  }
}
