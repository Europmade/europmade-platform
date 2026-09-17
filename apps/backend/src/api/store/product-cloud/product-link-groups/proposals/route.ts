import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { serializeProductLinkGroup } from "../../../../../modules/product-cloud/product-link-groups"
import { resolveApprovedSeller } from "../../resolve-seller"
import type { StoreSubmitProductLinkGroupProposalBodyInput } from "../../validators"

type LinkGroupRow = {
  id: string
  name: string
  dimensions: unknown
  status: string
  submitter_seller_id: string
  note?: string | null
  decision_reason?: string | null
  decided_by?: string | null
  decided_at?: Date | string | null
  created_at?: Date | string
  updated_at?: Date | string
}

type LinkMemberRow = {
  id: string
  group_id: string
  product_id: string
  values: unknown
  values_key: string
  sort_order?: number
  is_active_slot?: boolean
}

/**
 * GET /store/product-cloud/product-link-groups/proposals
 * Own submitted link groups (proposed/active/rejected). Never public.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const groups = (await productCloud.listProductLinkGroups(
    { submitter_seller_id: seller.id },
    { order: { created_at: "DESC" }, take: 200 }
  )) as LinkGroupRow[]
  const groupIds = groups.map((g) => g.id)
  const members =
    groupIds.length > 0
      ? ((await productCloud.listProductLinkMembers({
          group_id: groupIds,
        })) as LinkMemberRow[])
      : []
  const byGroup = new Map<string, LinkMemberRow[]>()
  for (const member of members) {
    const list = byGroup.get(member.group_id) || []
    list.push(member)
    byGroup.set(member.group_id, list)
  }

  res.json({
    product_link_groups: groups.map((group) =>
      serializeProductLinkGroup(group, byGroup.get(group.id) || [])
    ),
    count: groups.length,
  })
}

/**
 * POST /store/product-cloud/product-link-groups/proposals
 * Creates a group with status proposed. Never activates a link.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StoreSubmitProductLinkGroupProposalBodyInput>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const body = req.validatedBody
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const product_link_group = await productCloud.submitProductLinkGroupProposal(
    {
      name: body.name,
      dimensions: body.dimensions || [],
      members: body.members || [],
      note: body.note,
      request_kind: body.request_kind,
      target_group_id: body.target_group_id,
    },
    seller.id
  )

  res.status(201).json({ product_link_group })
}
