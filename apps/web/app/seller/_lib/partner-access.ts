"use client"

import { createContext, useContext } from "react"

export type PartnerRole = "RETAILER" | "BRAND_OWNER" | "PRODUCER"

export type PartnerPermission =
  | "products.view"
  | "products.manage"
  | "products.submit_approval"
  | "offers.manage"
  | "orders.manage"
  | "brands.view"
  | "brands.edit_description"
  | "brands.manage"
  | "facilities.view"
  | "facilities.manage"
  | "mie.manage"

export type PartnerAccessValue = {
  roles: PartnerRole[]
  permissions: PartnerPermission[]
  has: (permission: PartnerPermission) => boolean
}

export const PartnerAccessContext = createContext<PartnerAccessValue>({
  roles: [],
  permissions: [],
  has: () => false,
})

export function usePartnerAccess() {
  return useContext(PartnerAccessContext)
}

export function accessFromFlags(flags: {
  is_retailer?: boolean
  is_brand_owner?: boolean
  is_producer?: boolean
  is_producer_or_brand_owner?: boolean
  is_distributor?: boolean
  roles?: string[]
  permissions?: string[]
}): PartnerAccessValue {
  if (flags.roles?.length && flags.permissions?.length) {
    const permissions = flags.permissions as PartnerPermission[]
    return {
      roles: flags.roles as PartnerRole[],
      permissions,
      has: (permission) => permissions.includes(permission),
    }
  }
  const combined = Boolean(flags.is_producer_or_brand_owner)
  let is_brand_owner = Boolean(flags.is_brand_owner)
  let is_producer = Boolean(flags.is_producer)
  if (combined && !is_brand_owner && !is_producer) {
    is_brand_owner = true
    is_producer = true
  }
  const roles: PartnerRole[] = []
  if (flags.is_retailer || flags.is_distributor) roles.push("RETAILER")
  if (is_brand_owner) roles.push("BRAND_OWNER")
  if (is_producer) roles.push("PRODUCER")
  const permissions: PartnerPermission[] = []
  const add = (items: PartnerPermission[]) => {
    for (const item of items) {
      if (!permissions.includes(item)) permissions.push(item)
    }
  }
  if (roles.includes("RETAILER")) {
    add([
      "products.view",
      "products.manage",
      "products.submit_approval",
      "offers.manage",
      "orders.manage",
      "brands.view",
    ])
  }
  if (roles.includes("BRAND_OWNER")) {
    add([
      "products.view",
      "products.manage",
      "products.submit_approval",
      "brands.view",
      "brands.edit_description",
      "brands.manage",
      "facilities.view",
      "facilities.manage",
    ])
  }
  if (roles.includes("PRODUCER")) {
    add([
      "products.view",
      "products.manage",
      "products.submit_approval",
      "brands.view",
      "facilities.view",
      "facilities.manage",
      "mie.manage",
    ])
  }
  return {
    roles,
    permissions,
    has: (permission) => permissions.includes(permission),
  }
}
