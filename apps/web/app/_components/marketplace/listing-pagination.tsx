/**
 * CMP-035 Pagination — wireframe-chrome.
 * Interactie voltooit met Catalog/Search; UI toont de template-structuur.
 */
export function ListingPagination({ disabled = true }: { disabled?: boolean }) {
  const items = [
    { key: "prev", label: "‹", current: false },
    { key: "1", label: "1", current: true },
    { key: "2", label: "2", current: false },
    { key: "3", label: "3", current: false },
    { key: "ellipsis", label: "…", current: false },
    { key: "next", label: "›", current: false },
  ] as const

  return (
    <nav
      className="mt-6 flex justify-center gap-1.5"
      aria-label="Paginering"
      aria-disabled={disabled || undefined}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          disabled={disabled}
          aria-current={item.current ? "page" : undefined}
          className={`flex h-[30px] w-[30px] items-center justify-center rounded border text-xs ${
            item.current
              ? "border-wf-900 bg-wf-900 text-white"
              : "border-wf-300 text-wf-400"
          }`}
          title={disabled ? "Binnenkort beschikbaar" : undefined}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
