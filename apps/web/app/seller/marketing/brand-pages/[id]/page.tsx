"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Notice } from "@europmade/ui"
import { SellerGate } from "../../../_components/seller-gate"
import { DashboardSection } from "../../../_components/dashboard-section"
import {
  BrandApiError,
  getSellerBrand,
  patchSellerBrand,
  submitBrandOwnershipClaim,
  uploadSellerBrandMedia,
} from "../../../_lib/brands-api"
import { categorySlugFromName } from "../../../../_lib/localize-category-names"
import { MARKETPLACE_CATEGORIES } from "../../../../_lib/marketplace-categories"
import { useStorefrontLocale } from "../../../../_lib/i18n/use-storefront-locale"
import { t } from "../../../../_lib/i18n/messages"
import { resolveSellerMediaUrl } from "../../../_lib/media-url"

type ExtraType = "text" | "image" | "image_text"
type ExtraSection = {
  id: string
  type: ExtraType
  title: string
  text: string
  image_url: string
}
type ProductOption = {
  id: string
  title: string
  category_names: string[]
  image_url: string | null
}

function newSection(type: ExtraType): ExtraSection {
  return {
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    title: "",
    text: "",
    image_url: "",
  }
}

function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const next = [...list]
  const target = index + dir
  if (target < 0 || target >= next.length) return list
  const tmp = next[index]
  next[index] = next[target]
  next[target] = tmp
  return next
}

function ImageField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: string
  disabled?: boolean
  onChange: (url: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const preview = resolveSellerMediaUrl(value)
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-wf-700">{label}</p>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-24 w-full max-w-xs rounded object-cover" />
      ) : null}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || busy}
        className="block w-full text-[11px]"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (!file) return
          setBusy(true)
          setError(null)
          try {
            const uploaded = await uploadSellerBrandMedia(file)
            onChange(uploaded.storage_reference || uploaded.url)
          } catch (err) {
            setError(
              err instanceof BrandApiError ? err.message : "Upload mislukt."
            )
          } finally {
            setBusy(false)
          }
        }}
      />
      {busy ? <p className="text-[11px] text-wf-500">Uploaden…</p> : null}
      {error ? <p className="text-[11px] text-red-700">{error}</p> : null}
    </div>
  )
}

export default function SellerBrandPageEditorPage() {
  const locale = useStorefrontLocale()
  const params = useParams<{ id: string }>()
  const brandId = decodeURIComponent(params.id || "")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [brandName, setBrandName] = useState("")
  const [slug, setSlug] = useState("")
  const [intro, setIntro] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [heroUrl, setHeroUrl] = useState("")
  const [storyTitle, setStoryTitle] = useState("")
  const [story, setStory] = useState("")
  const [storyImage, setStoryImage] = useState("")
  const [categorySlugs, setCategorySlugs] = useState<string[]>([])
  const [productIds, setProductIds] = useState<string[]>([])
  const [extras, setExtras] = useState<ExtraSection[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [canManage, setCanManage] = useState(false)
  const [canClaim, setCanClaim] = useState(false)
  const [flowStatus, setFlowStatus] = useState("Niet aangevraagd")
  const [ownershipStatus, setOwnershipStatus] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState<string | null>(null)
  const [pageStatus, setPageStatus] = useState("unpublished")
  const [claimNote, setClaimNote] = useState("")
  const [claimUrl, setClaimUrl] = useState("")
  const [claimFile, setClaimFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const row = await getSellerBrand(brandId)
      const brand = row.brand as Record<string, unknown>
      const doc =
        brand.page_document && typeof brand.page_document === "object"
          ? (brand.page_document as {
              category_slugs?: string[]
              product_ids?: string[]
              extra_sections?: ExtraSection[]
            })
          : {}
      setBrandName(String(brand.name || ""))
      setSlug(String(brand.slug || ""))
      setIntro(String(brand.intro || ""))
      setLogoUrl(String(brand.logo_url || ""))
      setHeroUrl(String(brand.hero_image_url || ""))
      setStoryTitle(String(brand.story_title || ""))
      setStory(String(brand.story || ""))
      setStoryImage(String(brand.story_image_url || ""))
      setCategorySlugs(doc.category_slugs || [])
      setProductIds(doc.product_ids || [])
      setExtras(
        (doc.extra_sections || []).map((s) => ({
          id: s.id,
          type: s.type,
          title: s.title || "",
          text: s.text || "",
          image_url: s.image_url || "",
        }))
      )
      setProducts(
        (row.products || []).map((p) => ({
          id: p.id,
          title: p.title || p.id,
          category_names: p.category_names || (p.category ? [p.category] : []),
          image_url: p.image_url,
        }))
      )
      setCanManage(Boolean(row.access?.can_manage_public_page))
      setCanClaim(Boolean(row.ownership?.can_file_claim))
      setFlowStatus(row.ownership?.page_flow_status || "Niet aangevraagd")
      setOwnershipStatus(row.ownership?.claim?.status ?? null)
      setReviewNote(
        row.ownership?.page_review_note ??
          row.ownership?.claim?.review_note ??
          null
      )
      setPageStatus(row.ownership?.public_page_status || "unpublished")
    } catch (err) {
      setError(
        err instanceof BrandApiError ? err.message : "Merkpagina laden mislukt."
      )
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    void load()
  }, [load])

  const availableCategories = useMemo(() => {
    const map = new Map<string, string>()
    for (const product of products) {
      for (const name of product.category_names) {
        const slug = categorySlugFromName(name)
        if (!slug) continue
        const meta = MARKETPLACE_CATEGORIES.find((c) => c.slug === slug)
        map.set(slug, meta?.label ?? name)
      }
    }
    for (const slug of categorySlugs) {
      if (map.has(slug)) continue
      const meta = MARKETPLACE_CATEGORIES.find((c) => c.slug === slug)
      map.set(slug, meta?.label ?? slug)
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }))
  }, [products, categorySlugs])

  async function savePage(submitForReview = false) {
    setBusy(true)
    setNote(null)
    setError(null)
    try {
      await patchSellerBrand(brandId, {
        intro: intro.trim() || null,
        logo_url: logoUrl.trim() || null,
        hero_image_url: heroUrl.trim() || null,
        story_title: storyTitle.trim() || null,
        story: story.trim() || null,
        story_image_url: storyImage.trim() || null,
        submit_for_review: submitForReview || undefined,
        page_document: {
          category_slugs: categorySlugs,
          product_ids: productIds,
          extra_sections: extras.map((s) => ({
            id: s.id,
            type: s.type,
            title: s.title.trim() || null,
            text: s.text.trim() || null,
            image_url: s.image_url.trim() || null,
          })),
        },
      })
      setNote(
        submitForReview
          ? "Ingediend ter beoordeling. De pagina gaat pas live na admin-goedkeuring."
          : "Concept opgeslagen. Nog niet live."
      )
      await load()
    } catch (err) {
      setError(err instanceof BrandApiError ? err.message : "Opslaan mislukt.")
    } finally {
      setBusy(false)
    }
  }

  async function submitClaim() {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await submitBrandOwnershipClaim(brandId, {
        evidence_note: claimNote,
        evidence_url: claimUrl,
        file: claimFile,
      })
      setNote("Aanvraag ingediend.")
      setClaimFile(null)
      await load()
    } catch (err) {
      setError(
        err instanceof BrandApiError ? err.message : "Aanvraag mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  const claimOpen =
    canClaim &&
    ownershipStatus !== "Goedgekeurd" &&
    ownershipStatus !== "Ingediend" &&
    ownershipStatus !== "In beoordeling" &&
    ownershipStatus !== "Aanvullende informatie vereist"

  return (
    <SellerGate
      breadcrumb={[
        { label: t("sellerDashboardTitle", locale), href: "/seller" },
        { label: t("sellerNavMarketing", locale), href: "/seller/marketing" },
        {
          label: t("sellerMktBrandPageTitle", locale),
          href: "/seller/marketing/brand-pages",
        },
        { label: brandName || "Merkpagina" },
      ]}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">
            {brandName || t("sellerMktBrandPageTitle", locale)}
          </h1>
          {slug ? (
            <p className="mt-1 text-[11px] text-wf-500">/merk/{slug}</p>
          ) : null}
        </div>
        <Badge variant="outline">{flowStatus}</Badge>
      </div>

      {loading ? <p className="text-xs text-wf-500">Laden…</p> : null}
      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}
      {note ? (
        <Notice variant="info" className="mb-4">
          {note}
        </Notice>
      ) : null}

      {!loading ? (
        <DashboardSection title="Merkeigenaarschap" wrapChildren={false}>
          <div className="rounded-lg border border-wf-300 bg-white p-4">
            <p className="text-xs text-wf-700">
              Bewijs van merkeigenaarschap is optioneel totdat een eigenaar is
              goedgekeurd. Daarna mag alleen die merkeigenaar de pagina nog
              wijzigen. Publicatie gaat altijd via admin.
            </p>
            {ownershipStatus ? (
              <p className="mt-2 text-xs text-wf-600">
                Status: {ownershipStatus}
              </p>
            ) : null}
            {reviewNote ? (
              <p className="mt-1 text-xs text-wf-600">
                Opmerking admin: {reviewNote}
              </p>
            ) : null}
            {claimOpen ? (
              <div className="mt-3 space-y-2">
                <textarea
                  className="w-full rounded border border-wf-300 p-2 text-xs"
                  rows={3}
                  value={claimNote}
                  onChange={(e) => setClaimNote(e.target.value)}
                  placeholder="Toelichting / bewijs merkeigenaarschap"
                />
                <input
                  className="h-9 w-full rounded border border-wf-300 px-2 text-xs"
                  value={claimUrl}
                  onChange={(e) => setClaimUrl(e.target.value)}
                  placeholder="URL naar bewijs (optioneel)"
                />
                <input
                  type="file"
                  className="block text-[11px]"
                  onChange={(e) => setClaimFile(e.target.files?.[0] ?? null)}
                />
                <Button type="button" disabled={busy} onClick={() => void submitClaim()}>
                  {t("sellerBrandPageRequest", locale)}
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-wf-600">
                {ownershipStatus === "Ingediend" ||
                ownershipStatus === "In beoordeling"
                  ? "Je aanvraag wordt beoordeeld door EuropMade."
                  : ownershipStatus === "Aanvullende informatie vereist"
                    ? "Admin vraagt aanvulling. Dien opnieuw bewijs in zodra dat kan."
                    : canClaim
                      ? "Dien bewijs van merkeigenaarschap in als jij de merkeigenaar bent."
                      : "Je kunt voor dit merk geen eigenaarschap aanvragen."}
              </p>
            )}
            {ownershipStatus === "Aanvullende informatie vereist" && canClaim ? (
              <div className="mt-3 space-y-2">
                <textarea
                  className="w-full rounded border border-wf-300 p-2 text-xs"
                  rows={3}
                  value={claimNote}
                  onChange={(e) => setClaimNote(e.target.value)}
                  placeholder="Aanvullend bewijs"
                />
                <input
                  className="h-9 w-full rounded border border-wf-300 px-2 text-xs"
                  value={claimUrl}
                  onChange={(e) => setClaimUrl(e.target.value)}
                  placeholder="URL naar bewijs (optioneel)"
                />
                <input
                  type="file"
                  className="block text-[11px]"
                  onChange={(e) => setClaimFile(e.target.files?.[0] ?? null)}
                />
                <Button type="button" disabled={busy} onClick={() => void submitClaim()}>
                  Aanvulling indienen
                </Button>
              </div>
            ) : null}
          </div>
        </DashboardSection>
      ) : null}

      {!loading && !canManage ? (
        <Notice variant="warning" className="mb-4">
          Dit merk is geclaimd of je hebt geen rechten om de merkpagina te
          bewerken. Je kunt het merk wel blijven gebruiken bij producten.
        </Notice>
      ) : null}

      {!loading && canManage ? (
        <>
          <DashboardSection title="Basis" wrapChildren={false}>
            <div className="space-y-3 rounded-lg border border-wf-300 bg-white p-4">
              <input
                className="h-9 w-full rounded border border-wf-300 px-2 text-xs"
                value={brandName}
                disabled
                placeholder="Merknaam"
              />
              <textarea
                className="w-full rounded border border-wf-300 p-2 text-xs"
                rows={3}
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="Korte introductie"
              />
              <ImageField
                label="Merklogo"
                value={logoUrl}
                disabled={busy}
                onChange={setLogoUrl}
              />
              <ImageField
                label="Hero / banner"
                value={heroUrl}
                disabled={busy}
                onChange={setHeroUrl}
              />
            </div>
          </DashboardSection>

          <DashboardSection title="Merkverhaal" wrapChildren={false}>
            <div className="space-y-3 rounded-lg border border-wf-300 bg-white p-4">
              <input
                className="h-9 w-full rounded border border-wf-300 px-2 text-xs"
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                placeholder={`Over ${brandName || "het merk"}`}
              />
              <textarea
                className="w-full rounded border border-wf-300 p-2 text-xs"
                rows={6}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Merkverhaal"
              />
              <ImageField
                label="Afbeelding bij verhaal"
                value={storyImage}
                disabled={busy}
                onChange={setStoryImage}
              />
            </div>
          </DashboardSection>

          <DashboardSection title="Categorieën" wrapChildren={false}>
            <div className="rounded-lg border border-wf-300 bg-white p-4">
              {availableCategories.length === 0 ? (
                <p className="text-xs text-wf-600">
                  Nog geen productcategorieën voor dit merk.
                </p>
              ) : (
                <ul className="space-y-2">
                  {availableCategories.map((cat) => {
                    const selected = categorySlugs.includes(cat.value)
                    const index = categorySlugs.indexOf(cat.value)
                    return (
                      <li
                        key={cat.value}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              setCategorySlugs((prev) =>
                                prev.includes(cat.value)
                                  ? prev.filter((s) => s !== cat.value)
                                  : [...prev, cat.value]
                              )
                            }}
                          />
                          {cat.label}
                        </label>
                        {selected ? (
                          <span className="flex gap-1">
                            <button
                              type="button"
                              className="rounded border border-wf-300 px-1.5"
                              onClick={() =>
                                setCategorySlugs((prev) =>
                                  moveItem(prev, index, -1)
                                )
                              }
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="rounded border border-wf-300 px-1.5"
                              onClick={() =>
                                setCategorySlugs((prev) =>
                                  moveItem(prev, index, 1)
                                )
                              }
                            >
                              ↓
                            </button>
                          </span>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </DashboardSection>

          <DashboardSection title="Producten" wrapChildren={false}>
            <div className="rounded-lg border border-wf-300 bg-white p-4">
              {products.length === 0 ? (
                <p className="text-xs text-wf-600">
                  Nog geen eigen producten onder dit merk.
                </p>
              ) : (
                <ul className="space-y-2">
                  {products.map((product) => {
                    const selected = productIds.includes(product.id)
                    const index = productIds.indexOf(product.id)
                    return (
                      <li
                        key={product.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <label className="flex min-w-0 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              setProductIds((prev) =>
                                prev.includes(product.id)
                                  ? prev.filter((id) => id !== product.id)
                                  : [...prev, product.id]
                              )
                            }}
                          />
                          <span className="truncate">{product.title}</span>
                        </label>
                        {selected ? (
                          <span className="flex gap-1">
                            <button
                              type="button"
                              className="rounded border border-wf-300 px-1.5"
                              onClick={() =>
                                setProductIds((prev) =>
                                  moveItem(prev, index, -1)
                                )
                              }
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="rounded border border-wf-300 px-1.5"
                              onClick={() =>
                                setProductIds((prev) =>
                                  moveItem(prev, index, 1)
                                )
                              }
                            >
                              ↓
                            </button>
                          </span>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </DashboardSection>

          <DashboardSection title="Extra content" wrapChildren={false}>
            <div className="space-y-3 rounded-lg border border-wf-300 bg-white p-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={extras.length >= 8}
                  onClick={() => setExtras((prev) => [...prev, newSection("text")])}
                >
                  Tekst
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={extras.length >= 8}
                  onClick={() => setExtras((prev) => [...prev, newSection("image")])}
                >
                  Afbeelding
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={extras.length >= 8}
                  onClick={() =>
                    setExtras((prev) => [...prev, newSection("image_text")])
                  }
                >
                  Afbeelding + tekst
                </Button>
              </div>
              {extras.map((section, index) => (
                <div
                  key={section.id}
                  className="space-y-2 rounded border border-wf-200 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-wf-700">
                      {section.type === "text"
                        ? "Tekst"
                        : section.type === "image"
                          ? "Afbeelding"
                          : "Afbeelding + tekst"}
                    </p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded border border-wf-300 px-1.5 text-xs"
                        onClick={() =>
                          setExtras((prev) => moveItem(prev, index, -1))
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded border border-wf-300 px-1.5 text-xs"
                        onClick={() =>
                          setExtras((prev) => moveItem(prev, index, 1))
                        }
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="rounded border border-wf-300 px-1.5 text-xs"
                        onClick={() =>
                          setExtras((prev) => prev.filter((s) => s.id !== section.id))
                        }
                      >
                        Verwijder
                      </button>
                    </div>
                  </div>
                  {section.type !== "image" ? (
                    <input
                      className="h-9 w-full rounded border border-wf-300 px-2 text-xs"
                      value={section.title}
                      onChange={(e) =>
                        setExtras((prev) =>
                          prev.map((s) =>
                            s.id === section.id
                              ? { ...s, title: e.target.value }
                              : s
                          )
                        )
                      }
                      placeholder="Titel"
                    />
                  ) : null}
                  {section.type !== "image" ? (
                    <textarea
                      className="w-full rounded border border-wf-300 p-2 text-xs"
                      rows={4}
                      value={section.text}
                      onChange={(e) =>
                        setExtras((prev) =>
                          prev.map((s) =>
                            s.id === section.id
                              ? { ...s, text: e.target.value }
                              : s
                          )
                        )
                      }
                      placeholder="Tekst"
                    />
                  ) : null}
                  {section.type !== "text" ? (
                    <ImageField
                      label="Afbeelding"
                      value={section.image_url}
                      disabled={busy}
                      onChange={(url) =>
                        setExtras((prev) =>
                          prev.map((s) =>
                            s.id === section.id ? { ...s, image_url: url } : s
                          )
                        )
                      }
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </DashboardSection>

          <div className="mb-10 flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void savePage(false)}>
              Opslaan
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void savePage(true)}
            >
              {t("sellerBrandPagePublish", locale)}
            </Button>
            {slug ? (
              <Link
                href={`/merk/${slug}`}
                className="inline-flex h-9 items-center text-xs font-semibold text-wf-800 underline"
              >
                Bekijk publieke pagina
              </Link>
            ) : null}
          </div>
        </>
      ) : null}
    </SellerGate>
  )
}
