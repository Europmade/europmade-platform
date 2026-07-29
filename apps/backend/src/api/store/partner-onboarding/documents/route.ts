import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../modules/partner"
import PartnerModuleService from "../../../../modules/partner/service"
import {
  assertValidDocumentType,
  uploadPartnerOnboardingDocumentWorkflow,
} from "../../../../workflows/partner-onboarding"

// Zelfde grenzen als het client-side CMP-041 File Upload-component
// (`packages/ui/src/components/file-upload.tsx`, `DEFAULT_ACCEPT`/
// `DEFAULT_MAX_SIZE_BYTES`) — hier herhaald zodat de validatie niet
// uitsluitend client-side afgedwongen wordt (spec-Beveiligingseisen).
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

interface UploadedFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

/**
 * Documentupload — spec §2.2 stap 4 ("Documenten"), §2.7/§2.9.
 * Verwacht een multipart-body met bestand + `document_type` (zodra multer-
 * middleware is aangesloten). Type-cast via lokale interface i.p.v. Express.Multer.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const file = (req as AuthenticatedMedusaRequest & { file?: UploadedFile })
    .file
  const documentType = req.body && (req.body as Record<string, unknown>).document_type

  if (!file) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Geen bestand ontvangen.")
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ongeldig bestandsformaat. Toegestaan: PDF, JPEG, PNG."
    )
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Bestand is te groot (max. ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB).`
    )
  }
  if (typeof documentType !== "string" || !documentType) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Het veld document_type is verplicht."
    )
  }
  assertValidDocumentType(documentType)

  const partnerService = req.scope.resolve<PartnerModuleService>(PARTNER_MODULE)
  const customerId = req.auth_context.actor_id

  const [seller] = await partnerService.listSellers({ customer_id: customerId })
  if (!seller) {
    res
      .status(404)
      .json({ message: "Geen Partner Onboarding-aanvraag gevonden voor dit account." })
    return
  }

  const { result } = await uploadPartnerOnboardingDocumentWorkflow(req.scope).run({
    input: {
      sellerId: seller.id,
      documentType,
      filename: file.originalname,
      mimeType: file.mimetype,
      content: file.buffer.toString("base64"),
    },
  })

  res.status(201).json({ onboarding: result })
}
