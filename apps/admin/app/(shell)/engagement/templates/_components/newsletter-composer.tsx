"use client"

import { useState } from "react"
import { medusaBackendUrl, storefrontOrigin } from "../../../../../lib/medusa-backend-url"
import {
  searchCatalogProducts,
  type CatalogProductHit,
} from "../../../../../lib/engagement-admin-api"
import {
  parseMessageBlocks,
  serializeMessageBlocks,
  type MessageBlock,
} from "../../../../../lib/newsletter-document"

const fieldClass =
  "mt-1 w-full rounded border border-wf-400 bg-white px-2 py-1.5 text-sm text-wf-900"

const PRODUCT_BUTTONS = ["Bekijk product", "Ontdek het merk", "Bekijk collectie", "Ontdek meer"]

type ProductFields = {
  productId: string
  name: string
  text: string
  imageUrl: string
  linkLabel: string
  linkUrl: string
  commissionLabel?: string
}

function mediaUrl(url: string): string {
  if (!url) return ""
  if (url.startsWith("/")) return `${medusaBackendUrl()}${url}`
  return url
}

function emptyProduct(): ProductFields {
  return {
    productId: "",
    name: "",
    text: "",
    imageUrl: "",
    linkLabel: "",
    linkUrl: "",
    commissionLabel: "",
  }
}

function productFromHit(hit: CatalogProductHit): ProductFields {
  const path = hit.href.startsWith("/") ? hit.href : `/product/${hit.id}`
  return {
    productId: hit.id,
    name: hit.title,
    text: hit.description,
    imageUrl: hit.image_url,
    linkLabel: "Bekijk product",
    linkUrl: `${storefrontOrigin()}${path}`,
    commissionLabel: hit.commission_label?.trim() || "",
  }
}

function ImageSlot({
  url,
  disabled,
  onChange,
  onUpload,
}: {
  url: string
  disabled: boolean
  onChange: (url: string) => void
  onUpload?: (file: File) => Promise<string>
}) {
  return (
    <div>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(url)} alt="" className="h-36 w-full rounded object-cover" />
      ) : (
        <div className="flex h-36 items-center justify-center rounded border border-dashed border-wf-400 bg-wf-50 text-xs text-wf-600">
          Afbeelding toevoegen
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <input
          className={fieldClass}
          disabled={disabled}
          value={url}
          placeholder="Adres van de afbeelding"
          onChange={(event) => onChange(event.target.value)}
        />
        {onUpload ? (
          <label className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded border border-wf-400 px-2 text-[11px] text-wf-800">
            Uploaden
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                if (!file) return
                void onUpload(file).then(onChange)
              }}
            />
          </label>
        ) : null}
      </div>
    </div>
  )
}

function ProductPicker({
  disabled,
  onPick,
}: {
  disabled: boolean
  onPick: (product: ProductFields) => void
}) {
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<CatalogProductHit[]>([])
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function search(value: string) {
    setQuery(value)
    if (value.trim().length < 2) {
      setHits([])
      setNote(null)
      return
    }
    try {
      const found = await searchCatalogProducts(value)
      setHits(found)
      setNote(found.length === 0 ? "Geen gepubliceerd product gevonden." : null)
    } catch {
      setHits([])
      setNote("Producten zoeken is niet gelukt.")
    }
  }

  return (
    <div>
      <button
        type="button"
        className="text-[11px] font-medium text-wf-900 underline"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        Product zoeken
      </button>
      {open ? (
        <div className="mt-2 rounded border border-wf-300 bg-wf-50 p-2">
          <input
            className={fieldClass}
            value={query}
            placeholder="Naam of EAN"
            disabled={disabled}
            onChange={(event) => void search(event.target.value)}
          />
          {note ? <p className="mt-2 text-[11px] text-wf-600">{note}</p> : null}
          <ul className="mt-2 max-h-48 overflow-y-auto">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 py-1 text-left text-xs text-wf-900 hover:bg-white"
                  onClick={() => {
                    onPick(productFromHit(hit))
                    setOpen(false)
                    setQuery("")
                  }}
                >
                  {hit.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(hit.image_url)} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-wf-200 text-[9px] text-wf-600">
                      Foto
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate">{hit.title}</span>
                    {hit.brand_name || (hit.category_names ?? []).length > 0 || hit.commission_label ? (
                      <span className="block truncate text-[10px] text-wf-600">
                        {[
                          hit.brand_name,
                          ...(hit.category_names ?? []),
                          hit.commission_label ? `Commissie ${hit.commission_label}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function ProductFieldsEditor({
  product,
  disabled,
  onChange,
}: {
  product: ProductFields
  disabled: boolean
  onChange: (product: ProductFields) => void
}) {
  return (
    <div className="mt-2 rounded border border-wf-200 p-2">
      <ProductPicker
        disabled={disabled}
        onPick={(picked) =>
          onChange({
            ...picked,
            linkLabel: product.linkLabel.trim() || picked.linkLabel,
          })
        }
      />
      {product.name ? (
        <div className="mt-2">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(product.imageUrl)} alt="" className="h-28 w-full rounded object-cover" />
          ) : (
            <div className="flex h-28 items-center justify-center rounded border border-dashed border-wf-400 bg-wf-50 text-xs text-wf-600">
              Geen productafbeelding
            </div>
          )}
          <p className="mt-2 text-sm font-semibold text-wf-900">{product.name}</p>
          {product.commissionLabel ? (
            <p className="mt-2 text-xs font-medium text-wf-900">Commissie: {product.commissionLabel}</p>
          ) : null}
          {product.text ? <p className="mt-1 text-xs text-wf-700">{product.text}</p> : null}
          <label className="mt-2 block text-[11px] text-wf-600">
            Knoptekst
            <select
              className={fieldClass}
              disabled={disabled || !product.linkUrl}
              value={PRODUCT_BUTTONS.includes(product.linkLabel) ? product.linkLabel : "__custom"}
              onChange={(event) => {
                const value = event.target.value
                onChange({
                  ...product,
                  linkLabel: value === "__custom" ? "" : value,
                })
              }}
            >
              {PRODUCT_BUTTONS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
              <option value="__custom">Eigen tekst</option>
            </select>
          </label>
          {PRODUCT_BUTTONS.includes(product.linkLabel) ? null : (
            <input
              className={fieldClass}
              disabled={disabled || !product.linkUrl}
              value={product.linkLabel}
              placeholder="Knoptekst"
              onChange={(event) => onChange({ ...product, linkLabel: event.target.value })}
            />
          )}
          {product.linkLabel.trim() && product.linkUrl ? (
            <span className="mt-3 inline-block rounded bg-wf-900 px-4 py-2 text-xs font-semibold text-white">
              {product.linkLabel.trim()}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-wf-600">Kies een bestaand product.</p>
      )}
    </div>
  )
}

export function NewsletterComposer({
  value,
  disabled,
  onChange,
  onUploadImage,
}: {
  value: string
  disabled: boolean
  onChange: (html: string) => void
  onUploadImage?: (file: File) => Promise<string>
}) {
  const blocks = parseMessageBlocks(value)

  function commit(next: MessageBlock[]) {
    onChange(serializeMessageBlocks(next))
  }

  function update(index: number, block: MessageBlock) {
    commit(blocks.map((item, itemIndex) => (itemIndex === index ? block : item)))
  }

  function add(block: MessageBlock) {
    commit([...blocks, block])
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <section key={`${block.kind}-${index}`} className="rounded-lg border border-wf-300 bg-white p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-wf-900">
              {block.kind === "hero"
                ? "Opening"
                : block.kind === "heading"
                  ? "Kop"
                  : block.kind === "text"
                    ? "Tekst"
                    : block.kind === "image"
                      ? "Afbeelding"
                      : block.kind === "product"
                        ? "Product"
                        : block.kind === "product_group"
                          ? "Productgroep"
                          : block.kind === "cta"
                            ? "Knop"
                            : block.kind === "link"
                              ? "Link"
                              : block.kind === "split"
                                ? "Tekst en afbeelding"
                                : "Scheidingslijn"}
            </h3>
            <button
              type="button"
              className="text-[11px] text-wf-600 underline"
              disabled={disabled}
              onClick={() => commit(blocks.filter((_, item) => item !== index))}
            >
              Verwijderen
            </button>
          </div>
          {block.kind === "hero" ? (
            <div className="mt-2 space-y-2">
              <ImageSlot
                url={block.imageUrl}
                disabled={disabled}
                onUpload={onUploadImage}
                onChange={(imageUrl) => update(index, { ...block, imageUrl })}
              />
              <input
                className={fieldClass}
                disabled={disabled}
                value={block.headline}
                placeholder="Kop"
                onChange={(event) => update(index, { ...block, headline: event.target.value })}
              />
              <textarea
                className={`${fieldClass} min-h-[72px]`}
                disabled={disabled}
                value={block.text}
                placeholder="Introductie"
                onChange={(event) => update(index, { ...block, text: event.target.value })}
              />
            </div>
          ) : null}
          {block.kind === "heading" ? (
            <input
              className={fieldClass}
              disabled={disabled}
              value={block.text}
              onChange={(event) => update(index, { ...block, text: event.target.value })}
            />
          ) : null}
          {block.kind === "text" ? (
            <textarea
              className={`${fieldClass} min-h-[88px]`}
              disabled={disabled}
              value={block.text}
              onChange={(event) => update(index, { ...block, text: event.target.value })}
            />
          ) : null}
          {block.kind === "image" ? (
            <div className="mt-2">
              <ImageSlot
                url={block.imageUrl}
                disabled={disabled}
                onUpload={onUploadImage}
                onChange={(imageUrl) => update(index, { ...block, imageUrl })}
              />
            </div>
          ) : null}
          {block.kind === "product" ? (
            <ProductFieldsEditor
              product={block}
              disabled={disabled}
              onChange={(product) => update(index, { ...block, ...product })}
            />
          ) : null}
          {block.kind === "product_group" ? (
            <div className="mt-2">
              <input
                className={fieldClass}
                disabled={disabled}
                value={block.title}
                placeholder="Titel van de groep"
                onChange={(event) => update(index, { ...block, title: event.target.value })}
              />
              {block.products.map((product, productIndex) => (
                <ProductFieldsEditor
                  key={productIndex}
                  product={product}
                  disabled={disabled}
                  onChange={(next) =>
                    update(index, {
                      ...block,
                      products: block.products.map((item, itemIndex) =>
                        itemIndex === productIndex ? next : item
                      ),
                    })
                  }
                />
              ))}
              <button
                type="button"
                className="mt-2 text-[11px] text-wf-800 underline"
                disabled={disabled}
                onClick={() =>
                  update(index, { ...block, products: [...block.products, emptyProduct()] })
                }
              >
                Nog een product
              </button>
            </div>
          ) : null}
          {block.kind === "cta" || block.kind === "link" ? (
            <div className="mt-2 grid gap-2 tablet:grid-cols-2">
              <input
                className={fieldClass}
                disabled={disabled}
                value={block.label}
                placeholder={block.kind === "cta" ? "Knoptekst" : "Linktekst"}
                onChange={(event) => update(index, { ...block, label: event.target.value })}
              />
              <input
                className={fieldClass}
                disabled={disabled}
                value={block.url}
                placeholder="https://"
                onChange={(event) => update(index, { ...block, url: event.target.value })}
              />
            </div>
          ) : null}
          {block.kind === "split" ? (
            <div className="mt-2 space-y-2">
              <ImageSlot
                url={block.imageUrl}
                disabled={disabled}
                onUpload={onUploadImage}
                onChange={(imageUrl) => update(index, { ...block, imageUrl })}
              />
              <textarea
                className={`${fieldClass} min-h-[72px]`}
                disabled={disabled}
                value={block.text}
                onChange={(event) => update(index, { ...block, text: event.target.value })}
              />
            </div>
          ) : null}
        </section>
      ))}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["Opening", { kind: "hero", imageUrl: "", headline: "", text: "" }],
            ["Kop", { kind: "heading", text: "" }],
            ["Tekst", { kind: "text", text: "" }],
            ["Afbeelding", { kind: "image", imageUrl: "", alt: "" }],
            ["Product", { kind: "product", ...emptyProduct() }],
            ["Productgroep", { kind: "product_group", title: "", products: [emptyProduct()] }],
            ["Knop", { kind: "cta", label: "", url: "" }],
            ["Link", { kind: "link", label: "", url: "" }],
            ["Scheidingslijn", { kind: "divider" }],
            ["Tekst en afbeelding", { kind: "split", text: "", imageUrl: "" }],
          ] as Array<[string, MessageBlock]>
        ).map(([label, block]) => (
          <button
            key={label}
            type="button"
            className="h-8 rounded border border-wf-400 bg-white px-3 text-[11px] font-medium text-wf-900 disabled:opacity-50"
            disabled={disabled}
            onClick={() => add(block)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
