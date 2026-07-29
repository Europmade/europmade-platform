import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import PartnerModule from "../modules/partner"

/**
 * Koppelt Seller (Partner-module, custom) aan Customer (standaardmodule) —
 * conform `11-medusa-architecture.md` §3/§7.3: nooit een directe foreign key
 * in de standaard `customer`-tabel, uitsluitend via Module Links. De
 * standaard Customer-tabel wordt door deze link niet gewijzigd; Medusa
 * beheert de koppeling in een eigen, aparte link-tabel.
 */
export default defineLink(CustomerModule.linkable.customer, PartnerModule.linkable.seller)
