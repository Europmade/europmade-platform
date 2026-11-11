"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Button } from "@europmade/ui"
import {
  attributeOptionValues,
  categoryAdPositionsForProfile,
  comparisonSpecRows,
  emptyCategoryLocalized,
  isCmsScheduleWindowLive,
  isUspSlotManualOverride,
  orderedComparisonProducts,
  readCategoryAdPositions,
  reliableAttributeUnit,
  type CategoryAdPositionKey,
  type CategoryAdSource,
  type CategoryCmsAdPosition,
  type CategoryCmsImage,
  type CategoryCmsBlock,
  type CategoryCmsDocumentV2,
  type CategoryCmsLocalized,
  type CategoryCmsPresentation,
} from "@europmade/utils"
import { listTaxonomyCategories } from "../../lib/category-admin-api"
import {
  fetchComparableCategoryAttributes,
  fetchCategoryListingProducts,
  fetchCategoryProductRelations,
  fetchCategorySpecDefinitions,
  fetchFilterableCategoryAttributes,
  type CategoryListingProduct,
  type CategorySpecDefinition,
  type CmsBannerDto,
  type ComparableCategoryAttribute,
  type LocalizedCms,
} from "../../lib/cms-admin-api"
import { displayMediaUrl } from "../../lib/media-url"
import type { CmsI18nMeta } from "../../lib/cms-i18n"
import {
  CATEGORY_CMS_BLOCK_LABEL,
  addOptionalCategoryBlock,
  optionalBlocksToAdd,
} from "../../lib/cms-category-blocks"
import { CmsMediaPicker, imageFromHeroDesktop } from "./cms-media-picker"
import { CmsLocalizedField } from "./cms-localized-field"
import { CmsSeoFields } from "./cms-seo-fields"

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function TextList({
  label,
  values,
  onChange,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
}) {
  return (
    <label className="block text-sm text-wf-800">
      {label}
      <textarea
        className="mt-1 min-h-20 w-full rounded-lg border border-wf-300 px-2 py-1.5 text-sm"
        value={values.join("\n")}
        onChange={(event) => onChange(lines(event.target.value))}
      />
    </label>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block text-sm text-wf-800">
      {label}
      <input
        type="number"
        className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function PresentationFields({
  block,
  onChange,
}: {
  block: CategoryCmsBlock
  onChange: (block: CategoryCmsBlock) => void
}) {
  const presentation = block.presentation ?? {}
  const set = (patch: Partial<CategoryCmsPresentation>) =>
    onChange({ ...block, presentation: { ...presentation, ...patch } })
  return (
    <div className="space-y-2 rounded-lg border border-wf-200 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">Vormgeving</p>
      <label className="flex items-center justify-between text-sm">
        Achtergrond
        <input type="color" value={presentation.background_color || "#ffffff"} onChange={(event) => set({ background_color: event.target.value })} />
      </label>
      <label className="flex items-center justify-between text-sm">
        Tekstkleur
        <input type="color" value={presentation.text_color || "#16315c"} onChange={(event) => set({ text_color: event.target.value })} />
      </label>
      <label className="block text-sm">
        Uitlijning
        <select className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={presentation.align || "left"} onChange={(event) => set({ align: event.target.value as CategoryCmsPresentation["align"] })}>
          <option value="left">Links</option>
          <option value="center">Midden</option>
        </select>
      </label>
      <label className="block text-sm">
        Kolommen
        <select className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={String(presentation.columns || 4)} onChange={(event) => set({ columns: Number(event.target.value) })}>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </label>
      <label className="block text-sm">
        Afbeelding
        <select className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={presentation.image_position || "right"} onChange={(event) => set({ image_position: event.target.value as CategoryCmsPresentation["image_position"] })}>
          <option value="right">Rechts</option>
          <option value="left">Links</option>
        </select>
      </label>
      <label className="block text-sm">
        Ruimte
        <select className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={presentation.padding || "md"} onChange={(event) => set({ padding: event.target.value as CategoryCmsPresentation["padding"] })}>
          <option value="sm">Compact</option>
          <option value="md">Normaal</option>
          <option value="lg">Ruim</option>
        </select>
      </label>
      <label className="block text-sm">
        Hoeken
        <select className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={presentation.radius || "md"} onChange={(event) => set({ radius: event.target.value as CategoryCmsPresentation["radius"] })}>
          <option value="none">Recht</option>
          <option value="md">Afgerond</option>
          <option value="lg">Extra afgerond</option>
        </select>
      </label>
      <label className="block text-sm">
        Knop
        <select className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={presentation.button_style || "solid"} onChange={(event) => set({ button_style: event.target.value as CategoryCmsPresentation["button_style"] })}>
          <option value="solid">Gevuld</option>
          <option value="outline">Omlijnd</option>
        </select>
      </label>
    </div>
  )
}

function FilterControlEditor({
  slug,
  controls,
  onChange,
  loc,
}: {
  slug: string
  controls: Extract<CategoryCmsBlock, { type: "filters" }>["controls"]
  onChange: (controls: Extract<CategoryCmsBlock, { type: "filters" }>["controls"]) => void
  loc: (
    label: string,
    field: string,
    value: CategoryCmsLocalized,
    onChange: (value: LocalizedCms) => void
  ) => ReactNode
}) {
  const [attributes, setAttributes] = useState<Array<{ code: string; name: string }>>([])
  const [picked, setPicked] = useState("")
  useEffect(() => {
    let cancelled = false
    fetchFilterableCategoryAttributes(slug)
      .then((rows) => {
        if (!cancelled) setAttributes(rows)
      })
      .catch(() => {
        if (!cancelled) setAttributes([])
      })
    return () => {
      cancelled = true
    }
  }, [slug])
  const used = new Set(controls.map((control) => control.attributeKey))
  const available = attributes.filter((attribute) => !used.has(attribute.code))
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-wf-500">
        Alleen filterbare Product Cloud-attributen van deze categorie. Een filter verschijnt als er gepubliceerde producten met een waarde zijn. Zonder selectie toont de pagina alle bruikbare filters.
      </p>
      <div className="flex gap-2">
        <select
          className="w-full rounded-lg border border-wf-300 px-2 py-1.5 text-sm"
          value={picked}
          onChange={(event) => setPicked(event.target.value)}
        >
          <option value="">Kies een attribuut</option>
          {available.map((attribute) => (
            <option key={attribute.code} value={attribute.code}>
              {attribute.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="secondary"
          disabled={!picked}
          onClick={() => {
            const attribute = attributes.find((row) => row.code === picked)
            if (!attribute) return
            onChange([
              ...controls,
              {
                attributeKey: attribute.code,
                visible: true,
                label: emptyCategoryLocalized(),
                sortOrder: controls.length,
              },
            ])
            setPicked("")
          }}
        >
          Toevoegen
        </Button>
      </div>
      {attributes.length === 0 ? (
        <p className="text-sm text-wf-500">Geen filterbare attributen voor deze categorie.</p>
      ) : null}
      {controls.map((control, index) => {
        const known = attributes.find((attribute) => attribute.code === control.attributeKey)
        return (
          <div key={`${control.attributeKey}-${index}`} className="rounded-lg border border-wf-200 p-2">
            <p className="text-sm font-medium text-wf-800">
              {known?.name || control.attributeKey || "Onbekend attribuut"}
            </p>
            {known ? null : (
              <p className="text-[11px] text-wf-500">Dit attribuut is niet filterbaar voor deze categorie en verschijnt niet.</p>
            )}
            {loc("Label", `filter-${index}`, control.label, (label) => {
              const next = controls.slice()
              next[index] = { ...control, label }
              onChange(next)
            })}
            <NumberField
              label="Volgorde"
              value={control.sortOrder}
              onChange={(sortOrder) => {
                const next = controls.slice()
                next[index] = { ...control, sortOrder }
                onChange(next)
              }}
            />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={control.visible}
                onChange={(event) => {
                  const next = controls.slice()
                  next[index] = { ...control, visible: event.target.checked }
                  onChange(next)
                }}
              />
              Zichtbaar
            </label>
            <button
              type="button"
              className="mt-2 text-[11px] text-red-700 underline"
              onClick={() => onChange(controls.filter((_, item) => item !== index))}
            >
              Verwijderen
            </button>
          </div>
        )
      })}
    </div>
  )
}

function moveItem<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta
  if (target < 0 || target >= items.length) return items
  const next = items.slice()
  const [row] = next.splice(index, 1)
  next.splice(target, 0, row)
  return next
}

function euroPrice(value: number | null): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value)
}

function ComparisonEditor({
  slug,
  block,
  onChange,
  loc,
}: {
  slug: string
  block: Extract<CategoryCmsBlock, { type: "product_comparison" }>
  onChange: (block: Extract<CategoryCmsBlock, { type: "product_comparison" }>) => void
  loc: (
    label: string,
    field: string,
    value: CategoryCmsLocalized,
    onChange: (value: LocalizedCms) => void
  ) => ReactNode
}) {
  const [products, setProducts] = useState<CategoryListingProduct[]>([])
  const [attributes, setAttributes] = useState<ComparableCategoryAttribute[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [productPick, setProductPick] = useState("")
  const [specPick, setSpecPick] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchCategoryListingProducts(slug), fetchComparableCategoryAttributes(slug)])
      .then(([productRows, attributeRows]) => {
        if (cancelled) return
        setProducts(productRows)
        setAttributes(attributeRows)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const byId = new Map(products.map((product) => [product.id, product]))
  const selectedProducts = orderedComparisonProducts(
    products.map((product) => ({
      id: product.id,
      specs: product.attributes,
    })),
    block.product_ids
  )
  const rows = comparisonSpecRows(
    block.spec_codes,
    attributes.map((attribute) => ({ ...attribute, comparable: true })),
    selectedProducts
  )
  const rowByCode = new Map(rows.map((row) => [row.code, row]))
  const availableProducts = products.filter((product) => !block.product_ids.includes(product.id))
  const availableSpecs = attributes.filter((attribute) => !block.spec_codes.includes(attribute.code))

  return (
    <div className="space-y-4">
      {loc("Titel", "title", block.title, (title) => onChange({ ...block, title }))}
      <p className="text-[11px] text-wf-500">
        Alleen gepubliceerde producten met een actuele prijs in deze categorie. De draft bewaart product-id&apos;s en specificatiecodes. Draft opslaan publiceert niets.
      </p>
      {status === "loading" ? <p className="text-sm text-wf-500">Aanbod laden…</p> : null}
      {status === "error" ? (
        <p className="text-sm text-red-700">Het aanbod van deze categorie kon niet worden geladen.</p>
      ) : null}
      {status === "ready" && products.length === 0 ? (
        <p className="text-sm text-wf-500">Geen gepubliceerde producten met een prijs in deze categorie.</p>
      ) : null}
      <div className="flex gap-2">
        <select
          className="w-full rounded-lg border border-wf-300 px-2 py-1.5 text-sm"
          value={productPick}
          onChange={(event) => setProductPick(event.target.value)}
        >
          <option value="">Kies een product</option>
          {availableProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.title}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="secondary"
          disabled={!productPick}
          onClick={() => {
            if (!byId.has(productPick)) return
            onChange({ ...block, product_ids: [...block.product_ids, productPick] })
            setProductPick("")
          }}
        >
          Toevoegen
        </Button>
      </div>
      {block.product_ids.length === 0 ? (
        <p className="text-sm text-wf-600">Nog geen producten geselecteerd. Eén product is genoeg voor een vergelijking.</p>
      ) : null}
      {block.product_ids.map((id, index) => {
        const product = byId.get(id)
        const price = euroPrice(product?.from_price ?? null)
        const image = product ? displayMediaUrl(product.image_url) : null
        return (
          <div key={`${id}-${index}`} className="rounded-lg border border-[#1f8a4c] bg-emerald-50 p-2">
            <p className="text-[11px] font-medium text-[#1f8a4c]">Geselecteerd</p>
            <div className="mt-1 flex gap-2">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-12 w-12 rounded object-contain" />
              ) : null}
              <div className="min-w-0">
                <p className="text-sm font-medium text-wf-800">{product?.title || id}</p>
                {product?.brand_name ? <p className="text-xs text-wf-600">{product.brand_name}</p> : null}
                {price ? <p className="text-xs font-medium text-[#16315c]">{price}</p> : null}
                {product ? null : (
                  <p className="text-[11px] text-wf-500">Dit product hoort niet bij het aanbod van deze categorie.</p>
                )}
              </div>
            </div>
            <div className="mt-2 flex gap-2 text-[11px]">
              <button type="button" className="underline" onClick={() => onChange({ ...block, product_ids: moveItem(block.product_ids, index, -1) })}>
                Omhoog
              </button>
              <button type="button" className="underline" onClick={() => onChange({ ...block, product_ids: moveItem(block.product_ids, index, 1) })}>
                Omlaag
              </button>
              <button
                type="button"
                className="text-red-700 underline"
                onClick={() => onChange({ ...block, product_ids: block.product_ids.filter((_, item) => item !== index) })}
              >
                Verwijderen
              </button>
            </div>
          </div>
        )
      })}
      <div className="flex gap-2">
        <select
          className="w-full rounded-lg border border-wf-300 px-2 py-1.5 text-sm"
          value={specPick}
          onChange={(event) => setSpecPick(event.target.value)}
        >
          <option value="">Kies een specificatie</option>
          {availableSpecs.map((attribute) => (
            <option key={attribute.code} value={attribute.code}>
              {attribute.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="secondary"
          disabled={!specPick}
          onClick={() => {
            if (!attributes.some((attribute) => attribute.code === specPick)) return
            onChange({ ...block, spec_codes: [...block.spec_codes, specPick] })
            setSpecPick("")
          }}
        >
          Toevoegen
        </Button>
      </div>
      {status === "ready" && attributes.length === 0 ? (
        <p className="text-sm text-wf-500">Geen vergelijkbare specificaties voor deze categorie.</p>
      ) : null}
      {block.spec_codes.map((code, index) => {
        const attribute = attributes.find((row) => row.code === code)
        const row = rowByCode.get(code)
        const unit = reliableAttributeUnit(attribute?.unit)
        return (
          <div key={`${code}-${index}`} className="rounded-lg border border-wf-200 p-2">
            <p className="text-sm font-medium text-wf-800">{attribute?.name || code}</p>
            {attribute ? (
              <p className="text-[11px] text-wf-500">
                {attribute.dataType}
                {unit ? ` · eenheid ${unit}` : " · geen betrouwbare eenheid"}
              </p>
            ) : (
              <p className="text-[11px] text-wf-500">Deze specificatie is niet geschikt voor vergelijking in deze categorie.</p>
            )}
            {attribute && row && !row.hasValue && selectedProducts.length > 0 ? (
              <p className="mt-1 text-[11px] text-amber-800">
                Geen van de geselecteerde producten heeft een waarde. Verwijder deze specificatie als hij niet nodig is.
              </p>
            ) : null}
            <div className="mt-2 flex gap-2 text-[11px]">
              <button type="button" className="underline" onClick={() => onChange({ ...block, spec_codes: moveItem(block.spec_codes, index, -1) })}>
                Omhoog
              </button>
              <button type="button" className="underline" onClick={() => onChange({ ...block, spec_codes: moveItem(block.spec_codes, index, 1) })}>
                Omlaag
              </button>
              <button
                type="button"
                className="text-red-700 underline"
                onClick={() => onChange({ ...block, spec_codes: block.spec_codes.filter((_, item) => item !== index) })}
              >
                Verwijderen
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SortField({
  value,
  onChange,
}: {
  value: "relevance" | "newest" | "price_asc" | "price_desc"
  onChange: (value: "relevance" | "newest" | "price_asc" | "price_desc") => void
}) {
  return (
    <label className="block text-sm text-wf-800">
      Sortering
      <select
        className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
        value={value}
        onChange={(event) =>
          onChange(event.target.value as "relevance" | "newest" | "price_asc" | "price_desc")
        }
      >
        <option value="relevance">Relevantie</option>
        <option value="newest">Nieuwste</option>
        <option value="price_asc">Prijs oplopend</option>
        <option value="price_desc">Prijs aflopend</option>
      </select>
    </label>
  )
}

function nextItemId(prefix: string): string {
  return `${prefix}_${Date.now()}`
}

export function CmsCategoryBlockSettings({
  slug,
  doc,
  selectedId,
  meta,
  setMeta,
  banners,
  onDoc,
  onError,
}: {
  slug: string
  doc: CategoryCmsDocumentV2
  selectedId: string
  meta: CmsI18nMeta
  setMeta: (meta: CmsI18nMeta) => void
  banners: CmsBannerDto[]
  onDoc: (doc: CategoryCmsDocumentV2) => void
  onError: (message: string | null) => void
}) {
  if (selectedId === "chrome_header" || selectedId === "chrome_footer") {
    return (
      <p className="text-sm text-wf-600">
        Dit onderdeel is sitebreed beheerd en hoort niet bij het categoriedocument.
      </p>
    )
  }
  if (selectedId === "__add") {
    const available = optionalBlocksToAdd(doc, doc.profile)
    return (
      <div className="space-y-2">
        <p className="text-sm text-wf-700">
          Optionele blokken voor dit profiel. Verplichte blokken staan vast in de canonieke volgorde.
        </p>
        {available.length === 0 ? (
          <p className="text-sm text-wf-500">Alle optionele blokken staan al op de pagina.</p>
        ) : (
          available.map((type) => (
            <Button
              key={type}
              type="button"
              variant="secondary"
              onClick={() => onDoc(addOptionalCategoryBlock(doc, type, doc.profile, slug))}
            >
              {CATEGORY_CMS_BLOCK_LABEL[type]} toevoegen
            </Button>
          ))
        )}
      </div>
    )
  }
  if (selectedId === "seo") {
    return (
      <CmsSeoFields
        title={doc.seo.title}
        description={doc.seo.meta_description}
        canonical={`/categorie/${slug}`}
        onTitle={(title) => onDoc({ ...doc, seo: { ...doc.seo, title } })}
        onDescription={(meta_description) =>
          onDoc({ ...doc, seo: { ...doc.seo, meta_description } })
        }
        onCanonical={() => undefined}
        meta={meta}
        onMeta={setMeta}
      />
    )
  }

  const block = doc.blocks.find((item) => item.id === selectedId)
  if (!block) return <p className="text-sm text-wf-500">Selecteer een blok.</p>

  function commit(next: CategoryCmsBlock) {
    onDoc({
      ...doc,
      blocks: doc.blocks.map((item) => (item.id === block!.id ? next : item)),
    })
  }

  const loc = (label: string, field: string, value: CategoryCmsLocalized, onChange: (value: LocalizedCms) => void) => (
    <CmsLocalizedField
      label={label}
      field={`${block!.id}.${field}`}
      value={value}
      onChange={onChange}
      meta={meta}
      onMetaChange={setMeta}
    />
  )

  return (
    <div className="space-y-4" data-testid={`category-block-${block.type}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-wf-500">
        {CATEGORY_CMS_BLOCK_LABEL[block.type]}
      </p>
      {block.type === "hero" ? (
        <>
          {loc("Titel", "title", block.title, (title) => commit({ ...block, title }))}
          {loc("Subtitel", "subtitle", block.subtitle, (subtitle) => commit({ ...block, subtitle }))}
          {loc("Introductie", "intro", block.intro, (intro) => commit({ ...block, intro }))}
          {loc("Primaire knop", "primary_cta_label", block.primary_cta_label ?? emptyCategoryLocalized(), (primary_cta_label) => commit({ ...block, primary_cta_label }))}
          <label className="block text-sm text-wf-800">
            Link primaire knop
            <input className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={block.primary_cta_href ?? ""} onChange={(event) => commit({ ...block, primary_cta_href: event.target.value })} />
          </label>
          {loc("Tweede knop", "secondary_cta_label", block.secondary_cta_label ?? emptyCategoryLocalized(), (secondary_cta_label) => commit({ ...block, secondary_cta_label }))}
          <label className="block text-sm text-wf-800">
            Link tweede knop
            <input className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={block.secondary_cta_href ?? ""} onChange={(event) => commit({ ...block, secondary_cta_href: event.target.value })} />
          </label>
          <CmsMediaPicker
            label="Desktopafbeelding"
            image={imageFromHeroDesktop(block)}
            fieldPrefix={`${block.id}.desktop`}
            meta={meta}
            setMeta={setMeta}
            onError={onError}
            onChange={(image) =>
              commit({
                ...block,
                image_url: image?.url ?? null,
                image_asset_id: image?.asset_id ?? null,
                image_alt: image?.alt,
                image_frame: image ? image.frame ?? null : null,
              })
            }
          />
          <CmsMediaPicker
            label="Mobiele afbeelding"
            image={{
              asset_id: block.mobile_image_asset_id,
              url: block.mobile_image_url,
              alt: block.mobile_image_alt,
              frame: block.mobile_image_frame,
            }}
            fieldPrefix={`${block.id}.mobile`}
            meta={meta}
            setMeta={setMeta}
            onError={onError}
            onChange={(image) =>
              commit({
                ...block,
                mobile_image_url: image?.url ?? null,
                mobile_image_asset_id: image?.asset_id ?? null,
                mobile_image_alt: image?.alt,
                mobile_image_frame: image ? image.frame ?? null : null,
              })
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.hero_visible}
              onChange={(event) => commit({ ...block, hero_visible: event.target.checked })}
            />
            Hero zichtbaar
          </label>
          <label className="block text-sm text-wf-800">
            Gekoppelde banner
            <select
              className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
              value={block.banner_id ?? ""}
              onChange={(event) =>
                commit({ ...block, banner_id: event.target.value || null })
              }
            >
              <option value="">Geen banner</option>
              {banners.map((banner) => (
                <option key={banner.id} value={banner.id}>
                  {banner.title?.nl || banner.id}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.banner_visible}
              onChange={(event) => commit({ ...block, banner_visible: event.target.checked })}
            />
            Banner zichtbaar
          </label>
          <PresentationFields block={block} onChange={commit} />
        </>
      ) : null}

      {block.type === "usp_bar" ? (
        <div className="space-y-4">
          <p className="text-sm text-wf-600">
            Vier vaste posities direct onder de hero. Alleen een gewijzigd slot wordt handmatig.
          </p>
          {block.slots.map((slot, index) => {
            const manual = isUspSlotManualOverride(doc.block_meta[block.id], index)
            return (
              <div key={slot.id} className="rounded-lg border border-wf-200 p-3" data-testid={`usp-slot-${index}`}>
                <p className="mb-2 text-sm font-semibold text-wf-900">
                  Positie {index + 1}
                  {manual ? (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800" data-testid={`usp-manual-${index}`}>
                      Handmatig
                    </span>
                  ) : (
                    <span className="ml-2 text-[10px] font-semibold text-wf-500">Niet handmatig</span>
                  )}
                </p>
                {loc(`Titel ${index + 1}`, `usp-${index}-title`, slot.title, (title) => {
                  const slots = block.slots.slice() as typeof block.slots
                  slots[index] = { ...slot, title }
                  commit({ ...block, slots })
                })}
                {loc(`Tekst ${index + 1}`, `usp-${index}-body`, slot.body, (body) => {
                  const slots = block.slots.slice() as typeof block.slots
                  slots[index] = { ...slot, body }
                  commit({ ...block, slots })
                })}
                <label className="mt-2 block text-sm text-wf-800">
                  Icoon
                  <input
                    className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
                    value={slot.icon_key}
                    data-testid={`usp-icon-${index}`}
                    onChange={(event) => {
                      const slots = block.slots.slice() as typeof block.slots
                      slots[index] = { ...slot, icon_key: event.target.value }
                      commit({ ...block, slots })
                    }}
                  />
                </label>
              </div>
            )
          })}
        </div>
      ) : null}

      {block.type === "intro" || block.type === "seo_content" || block.type === "why_europmade" ? (
        <>
          {"title" in block
            ? loc("Titel", "title", block.title, (title) => commit({ ...block, title }))
            : null}
          {loc("Tekst", "body", block.body, (body) => commit({ ...block, body }))}
        </>
      ) : null}

      {block.type === "subcategory_tiles" || block.type === "product_group_tiles" ? (
        <>
          {loc("Titel", "title", block.title, (title) => commit({ ...block, title }))}
          <TextList
            label="Slugs (leeg = alle onderliggende categorieën)"
            values={block.include_slugs}
            onChange={(include_slugs) => commit({ ...block, include_slugs })}
          />
          <NumberField
            label="Maximum"
            value={block.max_items}
            onChange={(max_items) => commit({ ...block, max_items })}
          />
          <TileImages
            slug={slug}
            images={block.tile_images ?? []}
            onChange={(tile_images) => commit({ ...block, tile_images })}
            meta={meta}
            setMeta={setMeta}
            onError={onError}
          />
        </>
      ) : null}

      {block.type === "product_carousel" || block.type === "product_grid" || block.type === "related_products" ? (
        <>
          {loc("Titel", "title", block.title, (title) => commit({ ...block, title }))}
          {block.type === "related_products" ? null : (
            <SortField value={block.sort} onChange={(sort) => commit({ ...block, sort })} />
          )}
          <NumberField label="Aantal" value={block.limit} onChange={(limit) => commit({ ...block, limit })} />
          {block.type === "related_products" ? (
            <>
              <p className="text-[11px] text-wf-500">
                De kaarten komen alleen uit opgeslagen Product Cloud-relaties van de verkoopbare producten in deze categorie. Productnaam, afbeelding en prijs worden niet hier ingevuld.
              </p>
              <RelatedRelationsNotice slug={slug} />
            </>
          ) : (
            <p className="text-[11px] text-wf-500">
              Productnaam en afbeelding komen uit Product Cloud. Prijs en voorraad komen uit Commerce Cloud. Dit blok bepaalt presentatie en sortering.
            </p>
          )}
        </>
      ) : null}

      {block.type === "filters" ? (
        <FilterControlEditor
          slug={slug}
          controls={block.controls}
          onChange={(controls) => commit({ ...block, controls })}
          loc={loc}
        />
      ) : null}

      {block.type === "brand_overview" ? (
        <>
          {loc("Titel", "title", block.title, (title) => commit({ ...block, title }))}
          <NumberField
            label="Maximum logo's"
            value={block.max_items}
            onChange={(max_items) => commit({ ...block, max_items })}
          />
          <p className="text-[11px] text-wf-500">
            Merken komen uit de producten van deze categorie, inclusief toegestane onderliggende categorieën. De volgorde is het aantal producten en daarna de naam. Het maximum en de kolommen onder Vormgeving bepalen de presentatie. Zichtbaarheid staat bij de pagina-opbouw. Logo&apos;s komen van het merk. Een merk zonder logo blijft als tekst zichtbaar. Gesponsorde plaatsen blijven uit.
          </p>
        </>
      ) : null}

      {block.type === "choice_assistant_cta" ? (
        <>
          {loc("Titel", "title", block.title, (title) => commit({ ...block, title }))}
          {loc("Tekst", "body", block.body, (body) => commit({ ...block, body }))}
          {loc("Knoptekst", "cta", block.cta_label, (cta_label) => commit({ ...block, cta_label }))}
          <label className="block text-sm">
            Link
            <input
              className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
              value={block.href}
              onChange={(event) => commit({ ...block, href: event.target.value })}
            />
          </label>
          <label className="block text-sm">
            Specificatiecodes
            <textarea
              className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
              rows={3}
              value={(block.question_codes ?? []).join("\n")}
              onChange={(event) =>
                commit({
                  ...block,
                  question_codes: lines(event.target.value),
                })
              }
            />
          </label>
          <p className="text-[11px] text-wf-500">
            Eén Product Cloud-code per regel. Vragen verschijnen alleen als minstens twee verkoopbare producten een echte waarde hebben. Zonder voldoende data blijft dit de oproep en komt er geen advies.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              commit({
                ...block,
                cards: [...(block.cards ?? []), { id: nextItemId("choice"), label: emptyCategoryLocalized() }],
              })
            }
          >
            Antwoordkaart toevoegen
          </Button>
          {(block.cards ?? []).map((card, index) => (
            <div key={card.id} className="space-y-2 rounded-lg border border-wf-200 p-2">
              {loc("Kaart", `choice-card-${card.id}`, card.label, (label) => {
                const cards = (block.cards ?? []).slice()
                cards[index] = { ...card, label }
                commit({ ...block, cards })
              })}
              <CmsMediaPicker
                label="Kaartafbeelding"
                image={card.image}
                fieldPrefix={`${block.id}.${card.id}`}
                showFrame={false}
                meta={meta}
                setMeta={setMeta}
                onError={onError}
                onChange={(image) => {
                  const cards = (block.cards ?? []).slice()
                  cards[index] = { ...card, image: image ?? undefined }
                  commit({ ...block, cards })
                }}
              />
            </div>
          ))}
        </>
      ) : null}

      {block.type === "phase_navigation" ? (
        <>
          {block.phases.map((phase, index) => (
            <div key={phase.id} className="space-y-2 rounded-lg border border-wf-200 p-2">
              {loc("Fase", `phase-${phase.id}`, phase.label, (label) => {
                const phases = block.phases.slice()
                phases[index] = { ...phase, label }
                commit({ ...block, phases })
              })}
              <label className="block text-sm">
                Ankerblok
                <input
                  className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
                  value={phase.anchor_block_type}
                  onChange={(event) => {
                    const phases = block.phases.slice()
                    phases[index] = { ...phase, anchor_block_type: event.target.value.trim() }
                    commit({ ...block, phases })
                  }}
                />
              </label>
            </div>
          ))}
          <p className="text-[11px] text-wf-500">
            Een fase verschijnt alleen met een label en een bloktype dat op deze pagina staat.
          </p>
        </>
      ) : null}

      {block.type === "shortcuts" ? (
        <>
          {loc("Titel", "title", block.title, (title) => commit({ ...block, title }))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              commit({
                ...block,
                items: [
                  ...block.items,
                  {
                    id: nextItemId("shortcut"),
                    label: emptyCategoryLocalized(),
                    category_slug: "",
                    spec_code: "",
                    spec_value: "",
                  },
                ],
              })
            }
          >
            Snelkoppeling toevoegen
          </Button>
          {block.items.map((item, index) => (
            <div key={item.id} className="space-y-2 rounded-lg border border-wf-200 p-2">
              {loc("Label", `shortcut-${item.id}`, item.label, (label) => {
                const items = block.items.slice()
                items[index] = { ...item, label }
                commit({ ...block, items })
              })}
              <label className="block text-sm">
                Categorieslug
                <input className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={item.category_slug} onChange={(event) => {
                  const items = block.items.slice()
                  items[index] = { ...item, category_slug: event.target.value }
                  commit({ ...block, items })
                }} />
              </label>
              <label className="block text-sm">
                Specificatiecode
                <input className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={item.spec_code} onChange={(event) => {
                  const items = block.items.slice()
                  items[index] = { ...item, spec_code: event.target.value }
                  commit({ ...block, items })
                }} />
              </label>
              <label className="block text-sm">
                Specificatiewaarde
                <input className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={item.spec_value} onChange={(event) => {
                  const items = block.items.slice()
                  items[index] = { ...item, spec_value: event.target.value }
                  commit({ ...block, items })
                }} />
              </label>
            </div>
          ))}
        </>
      ) : null}

      {block.type === "featured_product" ? (
        <>
          {loc("Titel", "title", block.title, (title) => commit({ ...block, title }))}
          <label className="block text-sm">
            Product-id
            <input className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={block.product_id} onChange={(event) => commit({ ...block, product_id: event.target.value })} />
          </label>
          {loc("Motivatie", "motivation", block.motivation, (motivation) => commit({ ...block, motivation }))}
          <p className="text-[11px] text-wf-500">
            Het product verschijnt alleen als dit id in het verkoopbare aanbod staat. De motivatie herhaalt een opgeslagen feit en vult geen specificatie in.
          </p>
        </>
      ) : null}

      {block.type === "inspiration" ? (
        <>
          {loc("Titel", "title", block.title, (title) => commit({ ...block, title }))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              commit({
                ...block,
                items: [...block.items, { id: nextItemId("inspire"), title: emptyCategoryLocalized(), summary: emptyCategoryLocalized(), href: "" }],
              })
            }
          >
            Kaart toevoegen
          </Button>
          {block.items.map((item, index) => (
            <div key={item.id} className="space-y-2 rounded-lg border border-wf-200 p-2">
              {loc("Titel", `inspire-title-${item.id}`, item.title, (title) => {
                const items = block.items.slice()
                items[index] = { ...item, title }
                commit({ ...block, items })
              })}
              {loc("Samenvatting", `inspire-summary-${item.id}`, item.summary, (summary) => {
                const items = block.items.slice()
                items[index] = { ...item, summary }
                commit({ ...block, items })
              })}
              <label className="block text-sm">
                Link
                <input className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={item.href} onChange={(event) => {
                  const items = block.items.slice()
                  items[index] = { ...item, href: event.target.value }
                  commit({ ...block, items })
                }} />
              </label>
            </div>
          ))}
        </>
      ) : null}

      {block.type === "maintenance" ? (
        <>
          {loc("Titel", "title", block.title, (title) => commit({ ...block, title }))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              commit({
                ...block,
                steps: [...block.steps, { id: nextItemId("care"), frequency: emptyCategoryLocalized(), body: emptyCategoryLocalized() }],
              })
            }
          >
            Stap toevoegen
          </Button>
          {block.steps.map((step, index) => (
            <div key={step.id} className="space-y-2 rounded-lg border border-wf-200 p-2">
              {loc("Frequentie", `care-frequency-${step.id}`, step.frequency, (frequency) => {
                const steps = block.steps.slice()
                steps[index] = { ...step, frequency }
                commit({ ...block, steps })
              })}
              {loc("Tekst", `care-body-${step.id}`, step.body, (body) => {
                const steps = block.steps.slice()
                steps[index] = { ...step, body }
                commit({ ...block, steps })
              })}
            </div>
          ))}
        </>
      ) : null}

      {block.type === "brand_story" ? (
        <>
          {loc("Titel", "title", block.title, (title) => commit({ ...block, title }))}
          {loc("Tekst", "body", block.body, (body) => commit({ ...block, body }))}
          <label className="block text-sm">
            Merkslug
            <input className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5" value={block.brand_slug ?? ""} onChange={(event) => commit({ ...block, brand_slug: event.target.value.trim() || null })} />
          </label>
          <p className="text-[11px] text-wf-500">
            De link verschijnt alleen naar een gepubliceerde merkpagina in dit assortiment. Het land van de merkeigenaar wordt niet als herkomst getoond.
          </p>
        </>
      ) : null}

      {block.type === "advice_compare" ? (
        <AdviceCardsEditor block={block} meta={meta} setMeta={setMeta} onError={onError} onChange={commit} />
      ) : null}

      {block.type === "product_comparison" ? (
        <ComparisonEditor slug={slug} block={block} onChange={commit} loc={loc} />
      ) : null}

      {block.type === "spec_explain" ? (
        <SpecExplainEditor slug={slug} block={block} onChange={commit} loc={loc} />
      ) : null}

      {block.type === "buying_guide" ? (
        <BuyingGuideEditor block={block} meta={meta} setMeta={setMeta} onError={onError} onChange={commit} />
      ) : null}

      {block.type === "faq" ? (
        <>
          {loc("Titel", "title", block.title, (title) => commit({ ...block, title }))}
          <FaqList
            items={block.items}
            onChange={(items) => commit({ ...block, items })}
            meta={meta}
            setMeta={setMeta}
            fieldPrefix={block.id}
          />
        </>
      ) : null}

      {block.type === "ad_slot" ? (
        <AdPositionEditor
          block={block}
          profile={doc.profile}
          banners={banners}
          onChange={commit}
        />
      ) : null}
      {block.type === "hero" ? null : <PresentationFields block={block} onChange={commit} />}
    </div>
  )
}

const AD_POSITION_LABEL: Record<CategoryAdPositionKey, string> = {
  below_hero: "Onder de hero",
  between_content: "Tussen de inhoud",
  above_product_grid: "Boven het productoverzicht",
  below_product_grid: "Onder het productoverzicht",
}

const AD_SOURCE_LABEL: Record<CategoryAdSource, string> = {
  campaign: "Betaalde campagne",
  banner: "Redactionele banner",
  campaign_or_banner: "Campagne, anders banner",
}

function bannerLine(value: LocalizedCms | undefined): string {
  return (value?.nl || value?.en || value?.de || value?.fr || "").trim()
}

function AdPositionEditor({
  block,
  profile,
  banners,
  onChange,
}: {
  block: Extract<CategoryCmsBlock, { type: "ad_slot" }>
  profile: CategoryCmsDocumentV2["profile"]
  banners: CmsBannerDto[]
  onChange: (block: CategoryCmsBlock) => void
}) {
  const positions = readCategoryAdPositions(block)
  const allowed = categoryAdPositionsForProfile(profile)
  const used = new Set(positions.map((row) => row.position))
  const nextKey = allowed.find((key) => !used.has(key))

  function write(next: CategoryCmsAdPosition[]) {
    const ordered = next.map((row, index) => ({ ...row, sort: index }))
    onChange({
      ...block,
      positions: ordered,
      slot_id: ordered[0]?.position ?? "",
    })
  }

  function patch(id: string, change: Partial<CategoryCmsAdPosition>) {
    write(positions.map((row) => (row.id === id ? { ...row, ...change } : row)))
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-5 text-wf-500">
        Posities binnen dit ene advertentieblok. Een betaalde campagne komt uit de live selectie voor deze categorie. Een banner blijft in cms_banner. Direct onder de USP-balk staat altijd één banner: een goedgekeurde campagne die nu loopt voor deze categorie of een subcategorie, anders een automatische merkbanner uit gekoppelde producten. Die merkbanner wordt niet in CMS aangemaakt.
      </p>
      {positions.map((row, index) => {
        const choices = allowed.includes(row.position) ? allowed : [row.position, ...allowed]
        const banner = banners.find((item) => item.id === row.banner_id) ?? null
        const needsBanner = row.source === "banner" || row.source === "campaign_or_banner"
        const bannerLive = banner
          ? banner.published &&
            banner.visible &&
            isCmsScheduleWindowLive({ publish_at: banner.publish_at, expires_at: banner.expires_at })
          : false
        return (
          <div key={row.id} className="space-y-2 rounded-lg border border-wf-200 p-2">
            <label className="block text-sm text-wf-800">
              Naam
              <input
                className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
                value={row.label}
                onChange={(event) => patch(row.id, { label: event.target.value })}
              />
            </label>
            <label className="block text-sm text-wf-800">
              Positie
              <select
                className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
                value={row.position}
                onChange={(event) =>
                  patch(row.id, { position: event.target.value as CategoryAdPositionKey })
                }
              >
                {choices.map((key) => (
                  <option key={key} value={key} disabled={key !== row.position && used.has(key)}>
                    {AD_POSITION_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-wf-800">
              Type
              <select
                className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
                value={row.source}
                onChange={(event) =>
                  patch(row.id, { source: event.target.value as CategoryAdSource })
                }
              >
                {(Object.keys(AD_SOURCE_LABEL) as CategoryAdSource[]).map((source) => (
                  <option key={source} value={source}>
                    {AD_SOURCE_LABEL[source]}
                  </option>
                ))}
              </select>
            </label>
            {needsBanner ? (
              <label className="block text-sm text-wf-800">
                Banner
                <select
                  className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
                  value={row.banner_id ?? ""}
                  onChange={(event) => patch(row.id, { banner_id: event.target.value || null })}
                >
                  <option value="">Kies een gepubliceerde banner</option>
                  {banners
                    .filter((item) => item.published || item.id === row.banner_id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {bannerLine(item.title) || item.id}
                        {item.published ? "" : " (niet gepubliceerd)"}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <p className="text-[11px] text-wf-500">
                De live selectie bepaalt de campagne. De inhoud wordt niet in dit document gekopieerd.
              </p>
            )}
            {banner && needsBanner ? (
              <div className="flex gap-2 rounded-lg bg-wf-50 p-2">
                {banner.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={banner.image_url} alt="" className="h-14 w-24 rounded object-cover" />
                ) : null}
                <div className="min-w-0 text-xs text-wf-700">
                  <p className="font-semibold">{bannerLine(banner.title) || "Zonder titel"}</p>
                  {bannerLine(banner.subtitle) ? <p className="mt-0.5 line-clamp-2">{bannerLine(banner.subtitle)}</p> : null}
                  {bannerLive ? null : (
                    <p className="mt-1 text-wf-500">Deze banner is niet live en verschijnt niet op de pagina.</p>
                  )}
                </div>
              </div>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs text-wf-700 underline disabled:text-wf-300"
                disabled={index === 0}
                onClick={() => {
                  const next = [...positions]
                  const previous = next[index - 1]
                  const current = next[index]
                  if (!previous || !current) return
                  next[index - 1] = current
                  next[index] = previous
                  write(next)
                }}
              >
                Omhoog
              </button>
              <button
                type="button"
                className="text-xs text-wf-700 underline disabled:text-wf-300"
                disabled={index === positions.length - 1}
                onClick={() => {
                  const next = [...positions]
                  const following = next[index + 1]
                  const current = next[index]
                  if (!following || !current) return
                  next[index + 1] = current
                  next[index] = following
                  write(next)
                }}
              >
                Omlaag
              </button>
              <button
                type="button"
                className="text-xs text-red-700 underline"
                onClick={() => write(positions.filter((item) => item.id !== row.id))}
              >
                Verwijderen
              </button>
            </div>
          </div>
        )
      })}
      <Button
        type="button"
        variant="secondary"
        disabled={!nextKey}
        onClick={() => {
          if (!nextKey) return
          write([
            ...positions,
            {
              id: nextItemId("adpos"),
              position: nextKey,
              label: AD_POSITION_LABEL[nextKey],
              source: "campaign",
              banner_id: null,
              sort: positions.length,
            },
          ])
        }}
      >
        Positie toevoegen
      </Button>
    </div>
  )
}

function moveRow<T>(rows: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= rows.length) return rows
  const next = rows.slice()
  const current = next[index]
  const other = next[target]
  if (current === undefined || other === undefined) return rows
  next[index] = other
  next[target] = current
  return next
}

function RowActions({
  index,
  total,
  onMove,
  onRemove,
  removeLabel,
}: {
  index: number
  total: number
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  removeLabel: string
}) {
  return (
    <div className="flex gap-2">
      <button type="button" className="text-xs text-wf-700 underline disabled:text-wf-300" disabled={index === 0} onClick={() => onMove(-1)}>
        Omhoog
      </button>
      <button
        type="button"
        className="text-xs text-wf-700 underline disabled:text-wf-300"
        disabled={index === total - 1}
        onClick={() => onMove(1)}
      >
        Omlaag
      </button>
      <button type="button" className="text-xs text-red-700 underline" onClick={onRemove}>
        {removeLabel}
      </button>
    </div>
  )
}

function UrlField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm text-wf-800">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function AdviceCardsEditor({
  block,
  meta,
  setMeta,
  onError,
  onChange,
}: {
  block: Extract<CategoryCmsBlock, { type: "advice_compare" }>
  meta: CmsI18nMeta
  setMeta: (meta: CmsI18nMeta) => void
  onError: (message: string | null) => void
  onChange: (block: CategoryCmsBlock) => void
}) {
  function write(items: typeof block.items) {
    onChange({ ...block, items })
  }

  return (
    <div className="space-y-3">
      <CmsLocalizedField
        label="Titel"
        field={`${block.id}.title`}
        value={block.title}
        onChange={(title) => onChange({ ...block, title })}
        meta={meta}
        onMetaChange={setMeta}
      />
      {block.items.map((item, index) => (
        <div key={item.id} className="space-y-2 rounded-lg border border-wf-200 p-2">
          <p className="text-xs font-semibold text-wf-600">Kaart {index + 1}</p>
          <CmsLocalizedField
            label="Titel van de kaart"
            field={`${block.id}.${item.id}.label`}
            value={item.label}
            onChange={(label) => {
              const items = block.items.slice()
              items[index] = { ...item, label }
              write(items)
            }}
            meta={meta}
            onMetaChange={setMeta}
          />
          <CmsLocalizedField
            label="Korte introductie"
            field={`${block.id}.${item.id}.summary`}
            value={item.summary ?? emptyCategoryLocalized()}
            onChange={(summary) => {
              const items = block.items.slice()
              items[index] = { ...item, summary }
              write(items)
            }}
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
          <CmsLocalizedField
            label="Uitleg"
            field={`${block.id}.${item.id}.body`}
            value={item.body ?? emptyCategoryLocalized()}
            onChange={(body) => {
              const items = block.items.slice()
              items[index] = { ...item, body }
              write(items)
            }}
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
          <CmsMediaPicker
            label="Afbeelding"
            image={item.image}
            fieldPrefix={`${block.id}.${item.id}`}
            showCaption
            meta={meta}
            setMeta={setMeta}
            onError={onError}
            onChange={(image) => {
              const items = block.items.slice()
              items[index] = { ...item, image }
              write(items)
            }}
          />
          <CmsLocalizedField
            label="Knoptekst"
            field={`${block.id}.${item.id}.cta`}
            value={item.cta_label ?? emptyCategoryLocalized()}
            onChange={(cta_label) => {
              const items = block.items.slice()
              items[index] = { ...item, cta_label }
              write(items)
            }}
            meta={meta}
            onMetaChange={setMeta}
          />
          <UrlField
            label="Knoplink"
            value={item.href}
            onChange={(href) => {
              const items = block.items.slice()
              items[index] = { ...item, href }
              write(items)
            }}
          />
          <RowActions
            index={index}
            total={block.items.length}
            onMove={(direction) => write(moveRow(block.items, index, direction))}
            onRemove={() => write(block.items.filter((row) => row.id !== item.id))}
            removeLabel="Kaart verwijderen"
          />
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          write([
            ...block.items,
            { id: nextItemId("advice"), label: emptyCategoryLocalized(), href: "" },
          ])
        }
      >
        Kaart toevoegen
      </Button>
    </div>
  )
}

function BuyingGuideEditor({
  block,
  meta,
  setMeta,
  onError,
  onChange,
}: {
  block: Extract<CategoryCmsBlock, { type: "buying_guide" }>
  meta: CmsI18nMeta
  setMeta: (meta: CmsI18nMeta) => void
  onError: (message: string | null) => void
  onChange: (block: CategoryCmsBlock) => void
}) {
  function write(sections: typeof block.sections) {
    onChange({ ...block, sections })
  }

  return (
    <div className="space-y-3">
      <CmsLocalizedField
        label="Titel"
        field={`${block.id}.title`}
        value={block.title}
        onChange={(title) => onChange({ ...block, title })}
        meta={meta}
        onMetaChange={setMeta}
      />
      <CmsLocalizedField
        label="Introductie"
        field={`${block.id}.intro`}
        value={block.intro ?? emptyCategoryLocalized()}
        onChange={(intro) => onChange({ ...block, intro })}
        meta={meta}
        onMetaChange={setMeta}
        multiline
      />
      {block.sections.map((section, index) => (
        <div key={section.id} className="space-y-2 rounded-lg border border-wf-200 p-2">
          <p className="text-xs font-semibold text-wf-600">Sectie {index + 1}</p>
          <CmsLocalizedField
            label="Kop"
            field={`${block.id}.${section.id}.heading`}
            value={section.heading}
            onChange={(heading) => {
              const sections = block.sections.slice()
              sections[index] = { ...section, heading }
              write(sections)
            }}
            meta={meta}
            onMetaChange={setMeta}
          />
          <CmsLocalizedField
            label="Introductie van de sectie"
            field={`${block.id}.${section.id}.intro`}
            value={section.intro ?? emptyCategoryLocalized()}
            onChange={(intro) => {
              const sections = block.sections.slice()
              sections[index] = { ...section, intro }
              write(sections)
            }}
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
          <CmsLocalizedField
            label="Tekst"
            field={`${block.id}.${section.id}.body`}
            value={section.body}
            onChange={(body) => {
              const sections = block.sections.slice()
              sections[index] = { ...section, body }
              write(sections)
            }}
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
          <GuideSubheadings
            sectionId={section.id}
            items={section.subheadings ?? []}
            meta={meta}
            setMeta={setMeta}
            onChange={(subheadings) => {
              const sections = block.sections.slice()
              sections[index] = { ...section, subheadings }
              write(sections)
            }}
          />
          <GuideBullets
            sectionId={section.id}
            items={section.bullets ?? []}
            meta={meta}
            setMeta={setMeta}
            onChange={(bullets) => {
              const sections = block.sections.slice()
              sections[index] = { ...section, bullets }
              write(sections)
            }}
          />
          <CmsMediaPicker
            label="Afbeelding"
            image={section.image}
            fieldPrefix={`${block.id}.${section.id}`}
            showCaption
            meta={meta}
            setMeta={setMeta}
            onError={onError}
            onChange={(image) => {
              const sections = block.sections.slice()
              sections[index] = { ...section, image }
              write(sections)
            }}
          />
          <CmsLocalizedField
            label="Tip of aandachtspunt"
            field={`${block.id}.${section.id}.tip`}
            value={section.tip ?? emptyCategoryLocalized()}
            onChange={(tip) => {
              const sections = block.sections.slice()
              sections[index] = { ...section, tip }
              write(sections)
            }}
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
          <CmsLocalizedField
            label="Linktekst"
            field={`${block.id}.${section.id}.link`}
            value={section.link_label ?? emptyCategoryLocalized()}
            onChange={(link_label) => {
              const sections = block.sections.slice()
              sections[index] = { ...section, link_label }
              write(sections)
            }}
            meta={meta}
            onMetaChange={setMeta}
          />
          <UrlField
            label="Linkadres"
            value={section.link_href ?? ""}
            onChange={(link_href) => {
              const sections = block.sections.slice()
              sections[index] = { ...section, link_href }
              write(sections)
            }}
          />
          <CmsLocalizedField
            label="Knoptekst"
            field={`${block.id}.${section.id}.cta`}
            value={section.cta_label ?? emptyCategoryLocalized()}
            onChange={(cta_label) => {
              const sections = block.sections.slice()
              sections[index] = { ...section, cta_label }
              write(sections)
            }}
            meta={meta}
            onMetaChange={setMeta}
          />
          <UrlField
            label="Knopadres"
            value={section.cta_href ?? ""}
            onChange={(cta_href) => {
              const sections = block.sections.slice()
              sections[index] = { ...section, cta_href }
              write(sections)
            }}
          />
          <RowActions
            index={index}
            total={block.sections.length}
            onMove={(direction) => write(moveRow(block.sections, index, direction))}
            onRemove={() => write(block.sections.filter((row) => row.id !== section.id))}
            removeLabel="Sectie verwijderen"
          />
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          write([
            ...block.sections,
            {
              id: nextItemId("guide"),
              heading: emptyCategoryLocalized(),
              body: emptyCategoryLocalized(),
              bullets: [],
            },
          ])
        }
      >
        Sectie toevoegen
      </Button>
      <FaqList
        items={block.faq}
        onChange={(faq) => onChange({ ...block, faq })}
        meta={meta}
        setMeta={setMeta}
        fieldPrefix={block.id}
      />
      <CmsLocalizedField
        label="Afsluitende knoptekst"
        field={`${block.id}.closing`}
        value={block.closing_cta_label ?? emptyCategoryLocalized()}
        onChange={(closing_cta_label) => onChange({ ...block, closing_cta_label })}
        meta={meta}
        onMetaChange={setMeta}
      />
      <UrlField
        label="Afsluitend knopadres"
        value={block.closing_cta_href ?? ""}
        onChange={(closing_cta_href) => onChange({ ...block, closing_cta_href })}
      />
    </div>
  )
}

function GuideSubheadings({
  sectionId,
  items,
  onChange,
  meta,
  setMeta,
}: {
  sectionId: string
  items: Array<{ id: string; heading: CategoryCmsLocalized; body?: CategoryCmsLocalized }>
  onChange: (items: Array<{ id: string; heading: CategoryCmsLocalized; body?: CategoryCmsLocalized }>) => void
  meta: CmsI18nMeta
  setMeta: (meta: CmsI18nMeta) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-wf-800">Tussenkoppen</p>
      {items.map((item, index) => (
        <div key={item.id} className="space-y-2 rounded-lg bg-wf-50 p-2">
          <CmsLocalizedField
            label="Tussenkop"
            field={`${sectionId}.${item.id}.heading`}
            value={item.heading}
            onChange={(heading) => onChange(items.map((row) => (row.id === item.id ? { ...row, heading } : row)))}
            meta={meta}
            onMetaChange={setMeta}
          />
          <CmsLocalizedField
            label="Tekst onder de tussenkop"
            field={`${sectionId}.${item.id}.body`}
            value={item.body ?? emptyCategoryLocalized()}
            onChange={(body) => onChange(items.map((row) => (row.id === item.id ? { ...row, body } : row)))}
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
          <RowActions
            index={index}
            total={items.length}
            onMove={(direction) => onChange(moveRow(items, index, direction))}
            onRemove={() => onChange(items.filter((row) => row.id !== item.id))}
            removeLabel="Tussenkop verwijderen"
          />
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...items, { id: nextItemId("sub"), heading: emptyCategoryLocalized() }])}
      >
        Tussenkop toevoegen
      </Button>
    </div>
  )
}

function GuideBullets({
  sectionId,
  items,
  onChange,
  meta,
  setMeta,
}: {
  sectionId: string
  items: CategoryCmsLocalized[]
  onChange: (items: CategoryCmsLocalized[]) => void
  meta: CmsI18nMeta
  setMeta: (meta: CmsI18nMeta) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-wf-800">Opsomming</p>
      {items.map((item, index) => (
        <div key={`${sectionId}-bullet-${index}`} className="space-y-2">
          <CmsLocalizedField
            label={`Punt ${index + 1}`}
            field={`${sectionId}.bullet.${index}`}
            value={item}
            onChange={(next) => onChange(items.map((row, rowIndex) => (rowIndex === index ? next : row)))}
            meta={meta}
            onMetaChange={setMeta}
          />
          <RowActions
            index={index}
            total={items.length}
            onMove={(direction) => onChange(moveRow(items, index, direction))}
            onRemove={() => onChange(items.filter((_, rowIndex) => rowIndex !== index))}
            removeLabel="Punt verwijderen"
          />
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...items, emptyCategoryLocalized()])}>
        Punt toevoegen
      </Button>
    </div>
  )
}

function SpecExplainEditor({
  slug,
  block,
  onChange,
  loc,
}: {
  slug: string
  block: Extract<CategoryCmsBlock, { type: "spec_explain" }>
  onChange: (block: Extract<CategoryCmsBlock, { type: "spec_explain" }>) => void
  loc: (
    label: string,
    field: string,
    value: CategoryCmsLocalized,
    onChange: (value: LocalizedCms) => void
  ) => ReactNode
}) {
  const [definitions, setDefinitions] = useState<CategorySpecDefinition[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetchCategorySpecDefinitions(slug)
      .then((rows) => {
        if (!cancelled) setDefinitions(rows)
      })
      .catch(() => {
        if (!cancelled) setDefinitions([])
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <>
      {loc("Titel", "title", block.title, (title) => onChange({ ...block, title }))}
      <p className="text-[11px] text-wf-500">
        Label, datatype, eenheid en keuzewaarden komen uit de attribuutdefinitie. Zonder waarden toont de pagina geen schaal. De Level 2-variant met nisschema is nog niet beschikbaar.
      </p>
      {loaded && definitions.length === 0 ? (
        <p className="text-sm text-wf-600">Deze categorie heeft geen attribuutdefinities in Product Cloud.</p>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange({
            ...block,
            items: [
              ...block.items,
              {
                id: nextItemId("spec"),
                spec_code: "",
                title: emptyCategoryLocalized(),
                body: emptyCategoryLocalized(),
              },
            ],
          })
        }
      >
        Specificatie toevoegen
      </Button>
      {block.items.map((item, index) => {
        const definition = definitions.find((row) => row.code === item.spec_code)
        const known = Boolean(definition)
        const choices = attributeOptionValues(definition?.optionValues)
        return (
          <div key={item.id} className="space-y-2 rounded-lg border border-wf-200 p-2">
            <label className="block text-sm">
              Specificatie
              <select
                className="mt-1 w-full rounded-lg border border-wf-300 px-2 py-1.5"
                value={item.spec_code}
                onChange={(event) => {
                  const items = block.items.slice()
                  items[index] = { ...item, spec_code: event.target.value }
                  onChange({ ...block, items })
                }}
              >
                <option value="">Kies een specificatie</option>
                {item.spec_code && !known ? (
                  <option value={item.spec_code}>{item.spec_code} (niet in Product Cloud)</option>
                ) : null}
                {definitions.map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            {definition ? (
              <p className="text-[11px] text-wf-500">
                {[definition.name, definition.dataType, definition.unit].filter(Boolean).join(" · ")}
                {choices.length > 0 ? ` · ${choices.join(", ")}` : ""}
              </p>
            ) : item.spec_code ? (
              <p className="text-[11px] text-wf-500">Deze specificatiecode staat niet bij de attribuutdefinities.</p>
            ) : null}
            {loc("Titel", `spec-${item.id}-title`, item.title, (title) => {
              const items = block.items.slice()
              items[index] = { ...item, title }
              onChange({ ...block, items })
            })}
            {loc("Uitleg", `spec-${item.id}-body`, item.body, (body) => {
              const items = block.items.slice()
              items[index] = { ...item, body }
              onChange({ ...block, items })
            })}
          </div>
        )
      })}
    </>
  )
}

function RelatedRelationsNotice({ slug }: { slug: string }) {
  const [message, setMessage] = useState("Productrelaties worden gecontroleerd.")
  useEffect(() => {
    let cancelled = false
    fetchCategoryProductRelations(slug)
      .then((result) => {
        if (cancelled) return
        if (result.relations.length === 0) {
          setMessage(
            "Er zijn nog geen productrelaties in Product Cloud voor de verkoopbare producten in deze categorie. Het blok blijft leeg op de storefront."
          )
          return
        }
        const unique = new Set(result.relations.map((relation) => relation.to_product_id))
        setMessage(
          `${unique.size} gekoppeld product${unique.size === 1 ? "" : "en"} via een opgeslagen relatie. Alleen gepubliceerde producten met een geldige aanbieding worden getoond.`
        )
      })
      .catch(() => {
        if (!cancelled) setMessage("Productrelaties konden niet worden geladen.")
      })
    return () => {
      cancelled = true
    }
  }, [slug])
  return <p className="text-sm text-wf-700">{message}</p>
}

function FaqList({
  items,
  onChange,
  meta,
  setMeta,
  fieldPrefix,
}: {
  items: Array<{ id: string; question: CategoryCmsLocalized; answer: CategoryCmsLocalized }>
  onChange: (items: Array<{ id: string; question: CategoryCmsLocalized; answer: CategoryCmsLocalized }>) => void
  meta: CmsI18nMeta
  setMeta: (meta: CmsI18nMeta) => void
  fieldPrefix: string
}) {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([
            ...items,
            {
              id: nextItemId("faq"),
              question: emptyCategoryLocalized(),
              answer: emptyCategoryLocalized(),
            },
          ])
        }
      >
        Vraag toevoegen
      </Button>
      <p className="text-sm font-semibold text-wf-800">Vragen</p>
      {items.map((item, index) => (
        <div key={item.id} className="space-y-2 rounded-lg border border-wf-200 p-2">
          <CmsLocalizedField
            label="Vraag"
            field={`${fieldPrefix}.${item.id}.q`}
            value={item.question}
            onChange={(question) =>
              onChange(items.map((row) => (row.id === item.id ? { ...row, question } : row)))
            }
            meta={meta}
            onMetaChange={setMeta}
          />
          <CmsLocalizedField
            label="Antwoord"
            field={`${fieldPrefix}.${item.id}.a`}
            value={item.answer}
            onChange={(answer) =>
              onChange(items.map((row) => (row.id === item.id ? { ...row, answer } : row)))
            }
            meta={meta}
            onMetaChange={setMeta}
            multiline
          />
          <RowActions
            index={index}
            total={items.length}
            onMove={(direction) => onChange(moveRow(items, index, direction))}
            onRemove={() => onChange(items.filter((row) => row.id !== item.id))}
            removeLabel="Vraag verwijderen"
          />
        </div>
      ))}
    </div>
  )
}

function TileImages({
  slug,
  images,
  onChange,
  meta,
  setMeta,
  onError,
}: {
  slug: string
  images: Array<{ slug: string; image: CategoryCmsImage }>
  onChange: (images: Array<{ slug: string; image: CategoryCmsImage }>) => void
  meta: CmsI18nMeta
  setMeta: (meta: CmsI18nMeta) => void
  onError: (message: string | null) => void
}) {
  const [children, setChildren] = useState<Array<{ slug: string; name: string }>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listTaxonomyCategories()
      .then((result) => {
        const self = result.categories.find((row) => row.slug === slug)
        if (!self) {
          setChildren([])
          return
        }
        setChildren(
          result.categories
            .filter((row) => row.parent_category_id === self.id && row.slug)
            .map((row) => ({ slug: row.slug as string, name: row.name }))
        )
      })
      .catch((reason: Error) => setError(reason.message))
  }, [slug])

  function imageFor(childSlug: string): CategoryCmsImage | undefined {
    return images.find((row) => row.slug === childSlug)?.image
  }

  function setImage(childSlug: string, image: CategoryCmsImage | null) {
    const rest = images.filter((row) => row.slug !== childSlug)
    if (!image?.url) {
      onChange(rest)
      return
    }
    onChange([...rest, { slug: childSlug, image }])
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-wf-800">Afbeeldingen per tegel</p>
      {error ? <p className="text-[12px] text-red-700">{error}</p> : null}
      {children.length === 0 ? (
        <p className="text-[11px] text-wf-500">Geen onderliggende categorieën gevonden.</p>
      ) : (
        children.map((child) => (
          <CmsMediaPicker
            key={child.slug}
            label={child.name}
            image={imageFor(child.slug)}
            fieldPrefix={`${slug}.${child.slug}`}
            meta={meta}
            setMeta={setMeta}
            onError={onError}
            onChange={(image) => setImage(child.slug, image)}
          />
        ))
      )}
    </div>
  )
}
