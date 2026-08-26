import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { addMediaWorkflow } from "../../../../../../workflows/product-cloud"
import { resolveApprovedSeller } from "../../../resolve-seller"
import type { StoreAddMediaBodyInput } from "../../../validators"

type RouteParams = { id: string }

const ALLOWED_HOST_PROTOCOLS = new Set(["http:", "https:"])

function assertHttpUrl(url: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Ongeldige afbeeldings-URL."
    )
  }
  if (!ALLOWED_HOST_PROTOCOLS.has(parsed.protocol)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Alleen http(s)-URL's zijn toegestaan."
    )
  }
}

/** Add media by remote URL / storage reference. */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreAddMediaBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const body = req.validatedBody

  assertHttpUrl(body.storage_reference)

  // Light HEAD/GET probe — fail fast on unreachable URLs
  try {
    const probe = await fetch(body.storage_reference, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    })
    if (!probe.ok) {
      // Some CDNs block HEAD — try GET range
      const getProbe = await fetch(body.storage_reference, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal: AbortSignal.timeout(5000),
      })
      if (!getProbe.ok && getProbe.status !== 206) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Afbeeldings-URL is niet bereikbaar."
        )
      }
    }
  } catch (err) {
    if (err instanceof MedusaError) throw err
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Afbeeldings-URL kon niet worden gecontroleerd."
    )
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product = await productCloud.retrieveProduct(id)
  if (product.current_owner_seller_id !== seller.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen de producteigenaar mag media toevoegen."
    )
  }

  let versionId = body.version_id
  if (!versionId) {
    const versions = await productCloud.listProductVersions({
      product_id: id,
    })
    const working = [...versions].sort(
      (a: { version_number: number }, b: { version_number: number }) =>
        b.version_number - a.version_number
    )[0]
    versionId = working?.id
  }
  if (!versionId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Geen productversie gevonden voor media."
    )
  }

  if (body.media_type === "Hoofdafbeelding") {
    const existing = await productCloud.listProductMedias({
      product_version_id: versionId,
      media_type: "Hoofdafbeelding",
    })
    for (const row of existing) {
      await productCloud.updateProductMedias({
        id: row.id,
        media_type: "Overige afbeelding",
      })
    }
  }

  const { result } = await addMediaWorkflow(req.scope).run({
    input: {
      product_id: id,
      version_id: versionId,
      seller_id: seller.id,
      media_type: body.media_type,
      storage_reference: body.storage_reference,
    },
  })

  res.status(201).json({ media: result })
}
