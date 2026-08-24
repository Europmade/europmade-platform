import { redirect } from "next/navigation"

export default function LegacyAffiliateStatsRedirect() {
  redirect("/affiliate/dashboard/stats")
}
