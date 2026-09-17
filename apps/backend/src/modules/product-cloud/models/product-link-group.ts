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
    status: model
      .enum(["proposed", "active", "rejected", "inactive"])
      .default("proposed"),
    /**
     * create = new link group; amend = replace an active group;
     * deactivate = request to turn an active group inactive.
     */
    request_kind: model
      .enum(["create", "amend", "deactivate"])
      .default("create"),
    /** Active group this amend/deactivate request targets. */
    target_group_id: model.text().nullable(),
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
    { on: ["target_group_id"] },
  ])

export default ProductLinkGroup
