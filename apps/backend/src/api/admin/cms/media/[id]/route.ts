import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { cmsAssetAltTextForStorage, cmsAssetLocaleHasText, readCmsAssetAltText } from "@europmade/utils"
import { CMS_MODULE } from "../../../../../modules/cms"
import type CmsModuleService from "../../../../../modules/cms/service"
import { requestBackendOrigin } from "../../../../request-backend-origin"
import { serializeCmsAsset } from "../route"

type TextReq = AuthenticatedMedusaRequest & { params: { id: string } }

/**
 * PATCH /admin/cms/media/:id — alt-tekst op het bestaande cms_asset.
 * alt_text bewaart alleen de gelokaliseerde alt. Het bijschrift hoort bij het blok.
 * Een eerder genest bijschrift komt terug als migrated_caption en wordt niet opnieuw opgeslagen.
 */
export async function PATCH(req: TextReq, res: MedusaResponse) {
  const id = decodeURIComponent(req.params.id ?? "").trim()
  if (!id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Afbeelding ontbreekt.")
  }
  const body = (req.body ?? {}) as Record<string, unknown>
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const existing = await cms.retrieveCmsAsset(id).catch(() => null)
  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Afbeelding niet gevonden.")
  }
  const previous = readCmsAssetAltText((existing as { alt_text?: unknown }).alt_text)
  const row = await cms.updateCmsAssets({
    id,
    alt_text: cmsAssetAltTextForStorage(body.alt ?? previous.alt),
  })
  const asset = Array.isArray(row) ? row[0] : row
  res.status(200).json({
    asset: serializeCmsAsset(asset as Parameters<typeof serializeCmsAsset>[0], requestBackendOrigin(req)),
    migrated_caption: cmsAssetLocaleHasText(previous.caption) ? previous.caption : null,
  })
}
