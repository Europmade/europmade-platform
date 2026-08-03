/**
 * CMP-035 Pagination — wireframe-chrome, optioneel interactief.
 */
export function ListingPagination({
  page = 1,
  pageCount = 1,
  onPageChange,
  disabled = false,
}: {
  page?: number
  pageCount?: number
  onPageChange?: (page: number) => void
  disabled?: boolean
}) {
  const pages: Array<{ key: string; label: string; target?: number; current?: boolean }> =
    []

  pages.push({
    key: "prev",
    label: "‹",
    target: Math.max(1, page - 1),
  })

  const maxButtons = Math.min(pageCount, 5)
  for (let i = 1; i <= maxButtons; i++) {
    pages.push({
      key: `p-${i}`,
      label: String(i),
      target: i,
      current: i === page,
    })
  }

  if (pageCount > 5) {
    pages.push({ key: "ellipsis", label: "…" })
    pages.push({
      key: `p-${pageCount}`,
      label: String(pageCount),
      target: pageCount,
      current: page === pageCount,
    })
  }

  pages.push({
    key: "next",
    label: "›",
    target: Math.min(pageCount, page + 1),
  })

  return (
    <nav
      className="mt-6 flex justify-center gap-1.5"
      aria-label="Paginering"
      aria-disabled={disabled || undefined}
    >
      {pages.map((item) => {
        const isDisabled =
          disabled ||
          item.target == null ||
          !onPageChange ||
          (item.key === "prev" && page <= 1) ||
          (item.key === "next" && page >= pageCount)

        return (
          <button
            key={item.key}
            type="button"
            disabled={isDisabled}
            aria-current={item.current ? "page" : undefined}
            aria-label={
              item.key === "prev"
                ? "Vorige pagina"
                : item.key === "next"
                  ? "Volgende pagina"
                  : item.target
                    ? `Pagina ${item.target}`
                    : undefined
            }
            onClick={() => {
              if (item.target != null && onPageChange) onPageChange(item.target)
            }}
            className={`flex h-[30px] w-[30px] items-center justify-center rounded border text-xs ${
              item.current
                ? "border-wf-900 bg-wf-900 text-white"
                : "border-wf-300 text-wf-600 disabled:text-wf-400"
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
