import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../resolve-seller"
import { parseImportPayload, previewImport } from "../../import-helpers"

type MulterRequest = AuthenticatedMedusaRequest & {
  file?: { buffer: Buffer; originalname?: string; mimetype?: string }
}

/**
 * POST /store/product-cloud/import/preview
 * Never imports. Mapping can be omitted (auto) or supplied.
 */
export async function POST(req: MulterRequest, res: MedusaResponse) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const body = (req.body || {}) as {
    csv_text?: string
    headers?: string[]
    rows?: string[][]
    mapping?: Record<string, string | null>
    source_language_code?: string
  }
  const parsed = parseImportPayload({
    file: req.file,
    csv_text: body.csv_text,
    headers: body.headers,
    rows: body.rows,
  })
  let mapping = body.mapping
  if (typeof mapping === "string") {
    try {
      mapping = JSON.parse(mapping)
    } catch {
      mapping = undefined
    }
  }
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const preview = await previewImport({
    productCloud,
    sellerId: seller.id,
    headers: parsed.headers,
    rows: parsed.rows,
    mapping,
    source_language_code: body.source_language_code,
    excel_row_numbers: parsed.excel_row_numbers,
    structure_error: parsed.structure_error,
    skipped_empty: parsed.skipped_empty,
    skipped_header_rows: parsed.skipped_header_rows,
    transposed: parsed.transposed,
  })
  res.json({
    ...preview,
    csv_limitation:
      "CSV ondersteunt geen meerdere tabbladen. XLSX bevat Producten, Uitleg velden, Lijsten en Legenda. Concept zonder EAN is toegestaan. Kies de brontaal in het importscherm; geen aparte titel- of beschrijvingskolommen per taal.",
  })
}
