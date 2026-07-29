import { MedusaError } from "@medusajs/framework/utils"
import { OnboardingRoleSelection } from "./validation"

/**
 * Documenttypen — spec §2.7 ("Identiteitsbewijs, alle rollen"), §2.9
 * ("Bewijsstukken (minimaal één)" bij Producent/Distributeur,
 * "verplicht autorisatiebewijs" bij Distributeur), §2.2 stap 4
 * ("Documenten"). Namen komen exact overeen met de al bestaande
 * frontend-velden (`onboarding-wizard.tsx`, S3-02-03) — geen nieuwe
 * documentcategorie verzonnen.
 */
export const DOCUMENT_TYPES = [
  "identity_document",
  "chamber_of_commerce_extract",
  "production_proof",
  "authorization_proof",
  "additional_certifications",
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value)
}

/** Kolomnaam op `seller` voor elk documenttype (Deel A.3, S3-02-05-uitbreiding). */
export const DOCUMENT_FILE_ID_COLUMN: Record<DocumentType, string> = {
  identity_document: "identity_document_file_id",
  chamber_of_commerce_extract: "chamber_of_commerce_extract_file_id",
  production_proof: "production_proof_file_id",
  authorization_proof: "authorization_proof_file_id",
  additional_certifications: "additional_certifications_file_id",
}

export function assertValidDocumentType(value: string): asserts value is DocumentType {
  if (!isDocumentType(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Onbekend documenttype "${value}". Toegestaan: ${DOCUMENT_TYPES.join(", ")}.`
    )
  }
}

/**
 * Verplichte documenten per gekozen rol — spec §2.7 (identiteitsbewijs,
 * alle rollen), §2.9 (bewijsstuk bij Producent/Distributeur, expliciet
 * verplicht autorisatiebewijs bij Distributeur). "Minimaal één
 * bewijsstuk" (§2.9) wordt hier vertaald naar `production_proof`
 * verplicht voor Producent/Merkhouder — dezelfde regel die de frontend
 * (`requiredDocumentsPresent`, S3-02-03) al hanteert, hier server-side
 * herhaald zodat indienen niet uitsluitend client-side wordt afgedwongen.
 */
export function requiredDocumentTypesForRoles(
  roles: OnboardingRoleSelection
): DocumentType[] {
  const required: DocumentType[] = ["identity_document", "chamber_of_commerce_extract"]
  if (roles.is_producer_or_brand_owner) {
    required.push("production_proof")
  }
  if (roles.is_distributor) {
    required.push("authorization_proof")
  }
  return required
}
