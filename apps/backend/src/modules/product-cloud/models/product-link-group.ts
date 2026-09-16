import { model } from "@medusajs/framework/utils"
import ProductLinkMember from "./product-link-member"

/**
 * Seller-proposed / admin-approved grouping of standalone Product Cloud products.
 * Not a variant engine: members remain independent products (own id, EAN, offers).
 */
const ProductLinkGroup = model
  .define("pc_product_link_group", {
    id: model.id({ prefix: "plgrp" }).primaryKey(),
    name: model.text(),
    /** Ordered dimension names, e.g. ["Kleur", "Maat"]. */
    dimensions: model.json().default([]),
    status: model.enum(["proposed", "active", "rejected"]).default("proposed"),
    submitter_seller_id: model.text(),
    note: model.text().nullable(),
    decision_reason: model.text().nullable(),
    decided_by: model.text().nullable(),
    decided_at: model.dateTime().nullable(),
    members: model.hasMany(() => ProductLinkMember, { mappedBy: "group" }),
  })
  .indexes([
    { on: ["submitter_seller_id"] },
    { on: ["status"] },
  ])

export default ProductLinkGroup
