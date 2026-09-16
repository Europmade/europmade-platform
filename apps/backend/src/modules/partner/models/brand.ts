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
    hero_image_url: model.text().nullable(),
    story_title: model.text().nullable(),
    story_image_url: model.text().nullable(),
    page_document: model.json().default({}),
    page_draft: model.json().default({}),
    page_review_status: model
      .enum(["draft", "in_review", "info_requested", "published"])
      .default("draft"),
    page_submitted_by_seller_id: model.text().nullable(),
    page_review_note: model.text().nullable(),
    created_by_seller_id: model.text().nullable(),
    public_page_status: model
      .enum(["unpublished", "published"])
      .default("unpublished"),
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
    { on: ["created_by_seller_id"] },
    { on: ["public_page_status"] },
  ])

export default Brand
