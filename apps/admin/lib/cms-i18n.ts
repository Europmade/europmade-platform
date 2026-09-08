export const CMS_LOCALES = ["nl", "en", "de", "fr"] as const
export type CmsLocale = (typeof CMS_LOCALES)[number]

export type I18nOrigin = "source" | "machine" | "manual" | "empty"

export type FieldI18nMeta = Partial<Record<CmsLocale, I18nOrigin>>
export type CmsI18nMeta = Record<string, FieldI18nMeta>

export const CMS_LOCALE_LABEL: Record<CmsLocale, string> = {
  nl: "Nederlands",
  en: "English",
  de: "Deutsch",
  fr: "Français",
}

export const CMS_LOCALE_MODE_KEY = "em_cms_locale_mode"
export const CMS_LOCALE_KEY = "em_cms_active_locale"

export type CmsLocaleMode = "dropdown" | "all"

export function emptyI18nMeta(): CmsI18nMeta {
  return {}
}

export function localeOrigin(
  meta: CmsI18nMeta | null | undefined,
  field: string,
  locale: CmsLocale,
  value: string
): I18nOrigin {
  const stored = meta?.[field]?.[locale]
  if (stored === "source" || stored === "machine" || stored === "manual") {
    return stored
  }
  if (locale === "nl" && value.trim()) return "source"
  if (!value.trim()) return "empty"
  return "manual"
}

export function setLocaleOrigin(
  meta: CmsI18nMeta,
  field: string,
  locale: CmsLocale,
  origin: I18nOrigin
): CmsI18nMeta {
  return {
    ...meta,
    [field]: { ...(meta[field] ?? {}), [locale]: origin },
  }
}

export function originLabel(origin: I18nOrigin, locale: CmsLocale): string {
  if (locale === "nl" && (origin === "source" || origin === "manual")) {
    return "Bron"
  }
  switch (origin) {
    case "source":
      return "Bron"
    case "machine":
      return "Automatisch vertaald"
    case "manual":
      return "Handmatige override"
    default:
      return "Nog niet vertaald"
  }
}
