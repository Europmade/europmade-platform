import { redirect } from "next/navigation"

export default function LegacyAffiliatePayoutsRedirect() {
  redirect("/affiliate/dashboard/payouts")
}
