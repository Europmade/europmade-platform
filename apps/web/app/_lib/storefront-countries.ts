/** Bezorglanden in de bestaande checkout-lijst. Markt, niet taal. */
export const STOREFRONT_COUNTRIES: Array<{ code: string; label: string }> = [
  { code: "NL", label: "Nederland" },
  { code: "BE", label: "België" },
  { code: "DE", label: "Deutschland" },
  { code: "FR", label: "France" },
  { code: "AT", label: "Österreich" },
  { code: "ES", label: "España" },
  { code: "IT", label: "Italia" },
  { code: "IE", label: "Ireland" },
  { code: "PT", label: "Portugal" },
  { code: "PL", label: "Polska" },
]

export function storefrontCountryLabel(code: string): string {
  return (
    STOREFRONT_COUNTRIES.find((country) => country.code === code)?.label ?? code
  )
}
