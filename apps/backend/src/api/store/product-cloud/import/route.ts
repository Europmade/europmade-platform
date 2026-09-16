import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resolveApprovedSeller } from "../resolve-seller"
import {
  commitImport,
  parseImportPayload,
  sellerWithCompany,
} from "../import-helpers"

type MulterRequest = AuthenticatedMedusaRequest & {
  file?: { buffer: Buffer; originalname?: string; mimetype?: string }
}

/**
 * POST /store/product-cloud/import
 * Commits only when preview has zero error rows. Never silent partial import.
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
    row_overrides?: Record<string, Record<string, string>>
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
  let rowOverrides = body.row_overrides
  if (typeof rowOverrides === "string") {
    try {
      rowOverrides = JSON.parse(rowOverrides)
    } catch {
      rowOverrides = undefined
    }
  }
  const fullSeller = await sellerWithCompany(req.scope, seller)
  try {
    const result = await commitImport({
      container: req.scope,
      seller: fullSeller,
      headers: parsed.headers,
      rows: parsed.rows,
      mapping: mapping || {},
      source_language_code: body.source_language_code || "",
      row_overrides: rowOverrides,
      excel_row_numbers: parsed.excel_row_numbers,
      structure_error: parsed.structure_error,
      skipped_empty: parsed.skipped_empty,
      skipped_header_rows: parsed.skipped_header_rows,
      transposed: parsed.transposed,
    })
    res.status(200).json(result)
  } catch (err) {
    if (err instanceof MedusaError) throw err
    const message = err instanceof Error ? err.message : "Import mislukt."
    throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
  }
}
