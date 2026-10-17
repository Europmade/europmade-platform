import Link from "next/link"

const LINKS = [
  { href: "/product-cloud/products", id: "catalog", label: "Productcatalogus" },
  { href: "/product-cloud/offers", id: "offers", label: "Offerlijst" },
  { href: "/product-cloud/deliveries", id: "deliveries", label: "Productaanleveringen" },
] as const

export function ProductSectionNav(props: {
  active: "catalog" | "offers" | "deliveries"
  counts?: Partial<Record<"catalog" | "offers" | "deliveries", number>>
}) {
  return (
    <nav className="mb-4 flex flex-wrap gap-2" aria-label="Producten en offers">
      {LINKS.map((link) => {
        const active = props.active === link.id
        const count = props.counts?.[link.id]
        return (
          <Link
            key={link.id}
            href={link.href}
            className={
              active
                ? "rounded border border-wf-800 bg-wf-800 px-3 py-1.5 text-xs font-semibold text-white"
                : "rounded border border-wf-300 bg-white px-3 py-1.5 text-xs font-semibold text-wf-800"
            }
            aria-current={active ? "page" : undefined}
          >
            {link.label}
            {count != null ? ` (${count})` : ""}
          </Link>
        )
      })}
    </nav>
  )
}

export function offerCountLabel(count: number | undefined): string {
  const n = Math.max(0, count || 0)
  if (n === 0) return "0"
  if (n === 1) return "1 offer"
  return `${n} offers`
}
