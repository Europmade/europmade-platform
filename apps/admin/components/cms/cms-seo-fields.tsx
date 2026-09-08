"use client"

import { Input } from "@europmade/ui"
import type { LocalizedCms } from "../../lib/cms-admin-api"
import type { CmsI18nMeta } from "../../lib/cms-i18n"
import { CmsLocalizedField } from "./cms-localized-field"

export function CmsSeoFields({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  onTitle,
  onDescription,
  onCanonical,
  onOgTitle,
  onOgDescription,
  meta,
  onMeta,
}: {
  title: LocalizedCms
  description: LocalizedCms
  canonical: string
  ogTitle?: LocalizedCms
  ogDescription?: LocalizedCms
  onTitle: (v: LocalizedCms) => void
  onDescription: (v: LocalizedCms) => void
  onCanonical: (v: string) => void
  onOgTitle?: (v: LocalizedCms) => void
  onOgDescription?: (v: LocalizedCms) => void
  meta: CmsI18nMeta
  onMeta: (v: CmsI18nMeta) => void
}) {
  return (
    <div className="space-y-4">
      <CmsLocalizedField
        label="SEO-titel"
        field="seoTitle"
        value={title}
        onChange={onTitle}
        meta={meta}
        onMetaChange={onMeta}
      />
      <p className="text-[11px] text-wf-500">{(title.nl || "").length} / 60 tekens (NL)</p>
      <CmsLocalizedField
        label="SEO-beschrijving"
        field="seoDescription"
        value={description}
        onChange={onDescription}
        meta={meta}
        onMetaChange={onMeta}
        multiline
      />
      <p className="text-[11px] text-wf-500">
        {(description.nl || "").length} / 160 tekens (NL)
      </p>
      <label className="block text-sm font-semibold text-wf-800">
        Canonical URL
        <Input className="mt-1" value={canonical} onChange={(e) => onCanonical(e.target.value)} />
      </label>
      {ogTitle && onOgTitle ? (
        <CmsLocalizedField
          label="OG-titel"
          field="ogTitle"
          value={ogTitle}
          onChange={onOgTitle}
          meta={meta}
          onMetaChange={onMeta}
        />
      ) : null}
      {ogDescription && onOgDescription ? (
        <CmsLocalizedField
          label="OG-beschrijving"
          field="ogDescription"
          value={ogDescription}
          onChange={onOgDescription}
          meta={meta}
          onMetaChange={onMeta}
          multiline
        />
      ) : null}
    </div>
  )
}
