import { MedusaError } from "@medusajs/framework/utils"

/**
 * Partnerrollen binnen één Seller-account (geen aparte portals).
 * `is_producer_or_brand_owner` blijft de Blueprint-vlag; BRAND_OWNER en
 * PRODUCER zijn de uitgesplitste rechten (ADR-0041).
 */
export const PARTNER_ROLES = [
  "RETAILER",
  "BRAND_OWNER",
  "PRODUCER",
] as const

export type PartnerRole = (typeof PARTNER_ROLES)[number]

export const PARTNER_PERMISSIONS = [
  "products.view",
  "products.manage",
  "products.submit_approval",
  "offers.manage",
  "orders.manage",
  "brands.view",
  "brands.edit_description",
  "brands.manage",
  "facilities.view",
  "facilities.manage",
  "mie.manage",
] as const

export type PartnerPermission = (typeof PARTNER_PERMISSIONS)[number]

export type SellerRoleFlags = {
  is_retailer?: boolean | null
  is_brand_owner?: boolean | null
  is_producer?: boolean | null
  is_producer_or_brand_owner?: boolean | null
  is_distributor?: boolean | null
}

const ROLE_PERMISSIONS: Record<PartnerRole, PartnerPermission[]> = {
  RETAILER: [
    "products.view",
    "products.manage",
    "products.submit_approval",
    "offers.manage",
    "orders.manage",
    "brands.view",
  ],
  BRAND_OWNER: [
    "products.view",
    "products.manage",
    "products.submit_approval",
    "brands.view",
    "brands.edit_description",
    "brands.manage",
    "facilities.view",
    "facilities.manage",
  ],
  PRODUCER: [
    "products.view",
    "products.manage",
    "products.submit_approval",
    "brands.view",
    "facilities.view",
    "facilities.manage",
    "mie.manage",
  ],
}

export type NormalizedRoleFlags = {
  is_retailer: boolean
  is_brand_owner: boolean
  is_producer: boolean
  is_producer_or_brand_owner: boolean
  is_distributor: boolean
}

/**
 * Split flags + legacy combined flag. Als alleen de gecombineerde vlag
 * true is (pre-P2.6 data), gelden BRAND_OWNER én PRODUCER.
 */
export function normalizeRoleFlags(
  flags: SellerRoleFlags | null | undefined
): NormalizedRoleFlags {
  const is_retailer = Boolean(flags?.is_retailer)
  const is_distributor = Boolean(flags?.is_distributor)
  const combined = Boolean(flags?.is_producer_or_brand_owner)
  let is_brand_owner = Boolean(flags?.is_brand_owner)
  let is_producer = Boolean(flags?.is_producer)
  if (combined && !is_brand_owner && !is_producer) {
    is_brand_owner = true
    is_producer = true
  }
  return {
    is_retailer,
    is_brand_owner,
    is_producer,
    is_producer_or_brand_owner: is_brand_owner || is_producer || combined,
    is_distributor,
  }
}

export function rolesFromSeller(
  flags: SellerRoleFlags | null | undefined
): PartnerRole[] {
  const n = normalizeRoleFlags(flags)
  const roles: PartnerRole[] = []
  if (n.is_retailer || n.is_distributor) roles.push("RETAILER")
  if (n.is_brand_owner) roles.push("BRAND_OWNER")
  if (n.is_producer) roles.push("PRODUCER")
  return roles
}

export function permissionsFromRoles(roles: PartnerRole[]): PartnerPermission[] {
  const set = new Set<PartnerPermission>()
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role]) {
      set.add(permission)
    }
  }
  return [...set]
}

export function permissionsFromSeller(
  flags: SellerRoleFlags | null | undefined
): PartnerPermission[] {
  return permissionsFromRoles(rolesFromSeller(flags))
}

export function hasPermission(
  flags: SellerRoleFlags | null | undefined,
  permission: PartnerPermission
): boolean {
  return permissionsFromSeller(flags).includes(permission)
}

export function assertPermission(
  flags: SellerRoleFlags | null | undefined,
  permission: PartnerPermission
): void {
  if (!hasPermission(flags, permission)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Geen recht voor deze actie (${permission}).`
    )
  }
}

export function serializePartnerAccess(
  flags: SellerRoleFlags | null | undefined
) {
  const normalized = normalizeRoleFlags(flags)
  const roles = rolesFromSeller(normalized)
  return {
    ...normalized,
    roles,
    permissions: permissionsFromRoles(roles),
  }
}
