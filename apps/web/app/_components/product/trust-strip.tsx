import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { t } from "../../_lib/i18n/messages"

const TRUST_KEYS = [
  "trustSafePayment",
  "trust30DayReturn",
  "trustMadeInEurope",
  "trustVerifiedInfo",
] as const

export function TrustStrip({
  locale = DEFAULT_STOREFRONT_LOCALE,
}: {
  locale?: StorefrontLocale
}) {
  return (
    <ul
      className="grid grid-cols-2 gap-2 desktop:grid-cols-4"
      aria-label={t("trustAria", locale)}
    >
      {TRUST_KEYS.map((key) => (
        <li
          key={key}
          className="flex items-center gap-2.5 rounded-xl border border-wf-200 bg-white px-3 py-2 shadow-sm"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wf-900 text-xs font-bold text-white"
            aria-hidden
          >
            ✓
          </span>
          <span className="text-[12px] font-semibold leading-snug text-wf-800">
            {t(key, locale)}
          </span>
        </li>
      ))}
    </ul>
  )
}
