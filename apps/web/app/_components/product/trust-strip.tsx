const TRUST_ITEMS = [
  { icon: "✓", label: "Veilig betalen" },
  { icon: "✓", label: "30 dagen retour" },
  { icon: "✓", label: "Geproduceerd in Europa" },
  { icon: "✓", label: "Geverifieerde productinformatie" },
] as const

export function TrustStrip() {
  return (
    <ul
      className="grid grid-cols-2 gap-2 desktop:grid-cols-4"
      aria-label="Vertrouwenskenmerken"
    >
      {TRUST_ITEMS.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-2.5 rounded-xl border border-wf-200 bg-white px-3 py-2 shadow-sm"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wf-900 text-xs font-bold text-white"
            aria-hidden
          >
            {item.icon}
          </span>
          <span className="text-[12px] font-semibold leading-snug text-wf-800">
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  )
}
