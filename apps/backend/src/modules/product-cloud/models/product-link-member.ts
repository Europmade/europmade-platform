import { model } from "@medusajs/framework/utils"
import Product from "./product"
import ProductLinkGroup from "./product-link-group"

/**
 * Membership of one standalone Product Cloud product in a link group.
 * `values` maps each group dimension to a non-empty string.
 */
const ProductLinkMember = model
  .define("pc_product_link_member", {
    id: model.id({ prefix: "plmem" }).primaryKey(),
    group: model.belongsTo(() => ProductLinkGroup, {
      mappedBy: "members",
      foreignKeyName: "group_id",
    }),
    product: model.belongsTo(() => Product, {
      mappedBy: "link_members",
      foreignKeyName: "product_id",
    }),
    values: model.json().default({}),
    /** Canonical tuple for uniqueness within a group, e.g. Kleur=Zwart|Maat=M */
    values_key: model.text(),
    sort_order: model.number().default(0),
    /**
     * True only when the parent group is `active`.
     * Unique per product so a product cannot sit in two active groups.
     */
    is_active_slot: model.boolean().default(false),
  })
  .indexes([
    {
      on: ["group_id", "product_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      on: ["group_id", "values_key"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    { on: ["product_id"] },
    { on: ["group_id"] },
  ])

export default ProductLinkMember
