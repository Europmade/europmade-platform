import { redirect } from "next/navigation"

export default function LegacyAffiliateAccountRedirect() {
  redirect("/affiliate/dashboard/account")
}
