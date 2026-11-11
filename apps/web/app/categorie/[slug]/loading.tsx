import { PublicStorefrontChrome } from "../../_components/marketplace/public-storefront-chrome"
import { getStorefrontLocaleFromCookies } from "../../_lib/i18n/get-storefront-locale"

export default async function CategoryLoading() {
  const locale = await getStorefrontLocaleFromCookies()
  return (
    <PublicStorefrontChrome locale={locale}>
      <div role="status" aria-live="polite" className="px-4 py-6 sm:px-6">
        <p className="sr-only">Pagina laden</p>
        <div className="h-1 overflow-hidden rounded-full bg-[#16315c]">
          <div className="h-full w-2/5 animate-pulse bg-[#1f8a4c]" />
        </div>
        <div className="mt-5 h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
        <div className="mt-5 h-64 animate-pulse rounded-2xl bg-[#16315c]/15" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["a", "b", "c", "d"].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    </PublicStorefrontChrome>
  )
}
