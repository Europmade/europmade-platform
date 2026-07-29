import { model } from "@medusajs/framework/utils"
import Company from "./company"

/**
 * Seller — Blueprint `02-database-model.md`, Deel A.3.
 * De rol-toekenning die een `customer` tot verkopende/producerende partij maakt.
 *
 * `customer_id` verwijst naar de standaard Medusa Customer-module. Conform
 * `11-medusa-architecture.md` §3/§7.3 ("elke koppeling aan een standaardmodule
 * loopt via Module Links, nooit via een directe foreign key in een
 * standaardtabel") wordt de standaard `customer`-tabel zelf niet aangeraakt;
 * de koppeling wordt aanvullend formeel geregistreerd via
 * `src/links/seller-customer.ts`. Deze kolom blijft nodig om het schema exact
 * conform de Blueprint (uniek, verplicht veld op `seller` zelf) te houden.
 */
const Seller = model
  .define("seller", {
    id: model.id({ prefix: "sell" }).primaryKey(),
    customer_id: model.text().unique(),
    // Nullable: bij "Partner kiezen" (stap 1) bestaat alleen de rolkeuze nog
    // geen company — die wordt pas aangemaakt zodra de partner de
    // Bedrijfsgegevens (stap 2) daadwerkelijk invult (zie
    // `createOnboardingDraftStep`/`updateOnboardingDraftStep`). Zelfde
    // nullable-belongsTo-patroon als `brand.owner_company`/
    // `manufacturer.represented_by_company` in deze module.
    company: model
      .belongsTo(() => Company, {
        mappedBy: "sellers",
        foreignKeyName: "company_id",
      })
      .nullable(),
    is_retailer: model.boolean(),
    is_producer_or_brand_owner: model.boolean(),
    is_distributor: model.boolean(),
    // Letterlijke statuswaarden uit de Blueprint (Deel A.3) — geen eigen
    // slug-/codeschema verzonnen, de Blueprint zelf noemt geen andere tokens.
    onboarding_status: model.enum([
      "Concept",
      "Ingediend",
      "In beoordeling",
      "Aanvullende informatie vereist",
      "Goedgekeurd",
      "Afgekeurd",
    ]),
    approved_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["company_id"] }, { on: ["onboarding_status"] }])

export default Seller
