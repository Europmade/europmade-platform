import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  isCommercialNavKey,
  persistMediaReference,
  resolveMediaUrl,
} from "@europmade/utils"
import { requestBackendOrigin } from "../../../../../request-backend-origin"
import { CMS_MODULE } from "../../../../../../modules/cms"
import type CmsModuleService from "../../../../../../modules/cms/service"
import {
  deleteCommercialNavIcon,
  upsertCommercialNavIcon,
} from "../../icon-helpers"

function readKey(req: MedusaRequest): string {
  const raw = req.params?.key
  const key = typeof raw === "string" ? raw.trim().toLowerCase() : ""
  if (!isCommercialNavKey(key)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Onbekende commerciële categorie."
    )
  }
  return key
}

/**
 * PUT /admin/cms/commercial-nav/icons/:key
 * Body: { storage_reference: string } — CMS media URL or stored ref.
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const key = readKey(req)
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const body = (req.body ?? {}) as Record<string, unknown>
  const raw =
    typeof body.storage_reference === "string"
      ? body.storage_reference
      : typeof body.icon_url === "string"
        ? body.icon_url
        : ""
  const storage_reference = persistMediaReference(raw)
  if (!storage_reference) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Icoon-referentie ontbreekt."
    )
  }
  const row = await upsertCommercialNavIcon(cms, key, storage_reference)
  const origin = requestBackendOrigin(req)
  res.status(200).json({
    icon: {
      key,
      storage_reference: row.storage_reference,
      icon_url: resolveMediaUrl(row.storage_reference, origin),
    },
  })
}

/**
 * DELETE /admin/cms/commercial-nav/icons/:key
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const key = readKey(req)
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  await deleteCommercialNavIcon(cms, key)
  res.status(200).json({ deleted: true, key })
}
