import { model } from "@medusajs/framework/utils"
import Company from "./company"

/**
 * Brand — Blueprint `02-database-model.md`, Deel A.4.
 * Het merk waaronder een product wordt verkocht.
 *
 * Bewust geen relatie naar Manufacturer: "merk en fabrikant zijn nooit
 * stilzwijgend hetzelfde" (Blueprint, Domeinmodel §3) — die koppeling loopt
 * uitsluitend via `product_origin` (Deel B.14, latere ticket).
 */
const Brand = model
  .define("brand", {
    id: model.id({ prefix: "brand" }).primaryKey(),
    name: model.text(),
    slug: model.text().nullable(),
    intro: model.text().nullable(),
    story: model.text().nullable(),
    website_url: model.text().nullable(),
    logo_url: model.text().nullable(),
    owner_company: model
      .belongsTo(() => Company, {
        mappedBy: "brands",
        foreignKeyName: "owner_company_id",
      })
      .nullable(),
  })
  .indexes([
    { on: ["name"] },
    { on: ["slug"] },
    { on: ["owner_company_id"] },
  ])

export default Brand
