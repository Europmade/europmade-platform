import { redirect } from "next/navigation"

/** ADR-0011: home-KPI's volgen in S3-13-02 — Producten is de werkende landingsroute. */
export default function SellerIndexPage() {
  redirect("/seller/products")
}
