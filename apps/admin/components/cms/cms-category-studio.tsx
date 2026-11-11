"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@europmade/ui"
import {
  categoryCmsListExclusion,
  getBlock,
  syncLegacyMirrors,
  type CategoryCmsDocumentV2,
  type CategoryCmsProfile,
  type CategoryPreviewConceptProduct,
} from "@europmade/utils"
import {
  CmsAdminApiError,
  createCmsCategoryDraft,
  deleteCmsCategoryDraft,
  fetchCategoryPreviewProducts,
  generateCmsCategoryProposals,
  getCmsEditorialCategory,
  listCmsBanners,
  publishCmsCategoryDraft,
  rebaseCmsCategoryDraft,
  saveCmsCategoryDraft,
  type CmsBannerDto,
  type CmsCategoryPdDto,
} from "../../lib/cms-admin-api"
import {
  CATEGORY_CMS_BLOCK_LABEL,
  CATEGORY_CMS_PROFILE_LABEL,
  blockIdForPreviewSection,
  editorDocumentFromStored,
  isRequiredCategoryBlock,
  moveOptionalCategoryBlock,
  optionalBlocksToAdd,
  previewSectionForBlock,
  removeOptionalCategoryBlock,
  updateCategoryBlock,
} from "../../lib/cms-category-blocks"
import type { CmsI18nMeta } from "../../lib/cms-i18n"
import { CmsCategoryBlockSettings } from "./cms-category-block-settings"
import { CmsCategoryProposals } from "./cms-category-proposals"
import {
  CmsBreadcrumb,
  CmsEditorShell,
  type CmsViewport,
} from "./cms-editor-shell"
import { CmsLivePreview } from "./cms-live-preview"
import { CmsLocaleProvider, useCmsLocale } from "./cms-locale-toolbar"

type ViewMode = "published" | "draft"

function draftStatusLabel(category: CmsCategoryPdDto): string {
  if (!category.draft) return "Geen draft"
  const sync =
    category.draft.sync_state === "in_sync"
      ? "Draft – gelijk aan live"
      : "Draft – niet gepubliceerd"
  const review = (category.draft?.document as { editorial_review?: { needed?: boolean } } | null)
    ?.editorial_review
  const base = category.stale_base ? `${sync} · Verouderde basisversie` : sync
  return review?.needed ? `${base} · Assortiment gewijzigd, tekst controleren` : base
}

function Inner({ slug }: { slug: string }) {
  const { locale } = useCmsLocale()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("draft")
  const [pd, setPd] = useState<CmsCategoryPdDto | null>(null)
  const [viewport, setViewport] = useState<CmsViewport>("desktop")
  const [doc, setDoc] = useState<CategoryCmsDocumentV2 | null>(null)
  const [meta, setMeta] = useState<CmsI18nMeta>({})
  const [selectedId, setSelectedId] = useState("seo")
  const [banners, setBanners] = useState<CmsBannerDto[]>([])
  const [proposalRefresh, setProposalRefresh] = useState(0)
  const [showConcepts, setShowConcepts] = useState(false)
  const [conceptProducts, setConceptProducts] = useState<CategoryPreviewConceptProduct[] | null>(
    null
  )

  const profile = (pd?.profile ?? null) as CategoryCmsProfile | null

  function showDocument(category: CmsCategoryPdDto, mode: ViewMode) {
    const source =
      mode === "published"
        ? category.published?.document
        : category.draft?.document ?? null
    if (source == null || !category.profile) {
      setDoc(null)
      return
    }
    const next = editorDocumentFromStored(source, {
      slug,
      profile: category.profile,
    })
    setDoc(next)
    if (!next) {
      setError("Het opgeslagen document heeft een ander profiel dan de taxonomie.")
    }
  }

  function applyCategory(category: CmsCategoryPdDto, preferredMode?: ViewMode) {
    const profileWasSent = category.profile !== undefined
    const merged: CmsCategoryPdDto = {
      ...category,
      profile: profileWasSent ? category.profile : pd?.profile ?? null,
      profile_error: profileWasSent
        ? category.profile_error ?? null
        : pd?.profile_error ?? null,
    }
    setPd(merged)
    setMeta((category.i18n_meta as CmsI18nMeta) ?? {})
    const nextMode: ViewMode =
      preferredMode ??
      (category.draft ? "draft" : category.published ? "published" : "draft")
    setViewMode(nextMode)
    if (merged.profile_error) {
      setError(`Geen categorieprofiel: ${merged.profile_error}`)
    }
    showDocument(merged, nextMode)
  }

  async function reload(preferredMode?: ViewMode) {
    const { category } = await getCmsEditorialCategory(slug)
    applyCategory(category, preferredMode)
  }

  useEffect(() => {
    reload().catch((e: Error) => setError(e.message))
    listCmsBanners()
      .then((result) => setBanners(result.banners ?? []))
      .catch(() => setBanners([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    setShowConcepts(false)
  }, [slug])

  useEffect(() => {
    if (viewMode !== "draft" || !showConcepts) {
      setConceptProducts(null)
      return
    }
    let cancelled = false
    setConceptProducts(null)
    fetchCategoryPreviewProducts(slug)
      .then((products) => {
        if (!cancelled) setConceptProducts(products)
      })
      .catch(() => {
        if (!cancelled) setConceptProducts([])
      })
    return () => {
      cancelled = true
    }
  }, [showConcepts, slug, viewMode])

  function switchMode(mode: ViewMode) {
    if (!pd) return
    setError(null)
    setOk(null)
    if (mode !== "draft") setShowConcepts(false)
    setViewMode(mode)
    if (mode === "published" && !pd.published) {
      setError("Er is nog geen gepubliceerde versie.")
      setDoc(null)
      return
    }
    if (mode === "draft" && !pd.draft) {
      setDoc(null)
      return
    }
    showDocument(pd, mode)
  }

  async function runAction(label: string, fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      await fn()
    } catch (e) {
      if (e instanceof CmsAdminApiError) {
        if (e.type === "stale_draft_base") {
          setError(
            `${e.message} Rebase eerst: behoud draft of vervang door live. Geen automatische merge.`
          )
        } else {
          setError(e.message)
        }
      } else {
        setError(e instanceof Error ? e.message : label)
      }
    } finally {
      setBusy(false)
    }
  }

  async function saveDraft() {
    if (!pd?.draft || !doc) {
      setError("Geen draft om op te slaan. Maak eerst een draft aan.")
      return
    }
    await runAction("Opslaan mislukt", async () => {
      const { category } = await saveCmsCategoryDraft(slug, {
        document: doc,
        expected_draft_revision: pd.draft!.revision,
        i18n_meta: meta,
      })
      applyCategory(category, "draft")
      setOk("Draft opgeslagen.")
    })
  }

  async function removeDraft() {
    if (!pd?.draft) return
    if (
      !window.confirm(
        "Draft verwijderen? De gepubliceerde liveversie blijft intact."
      )
    ) {
      return
    }
    await runAction("Draft verwijderen mislukt", async () => {
      const { category } = await deleteCmsCategoryDraft(slug)
      applyCategory(category, category.published ? "published" : "draft")
      setOk("Draft verwijderd. Liveversie ongewijzigd.")
    })
  }

  async function publishDraft() {
    if (!pd?.draft) {
      setError("Publiceren kan alleen vanuit Draft.")
      return
    }
    if (pd.stale_base) {
      setError(
        `Verouderde basisversie: draft baseert op v${pd.draft.base_version}, live is v${pd.published?.version ?? "?"}. Rebase eerst — geen automatische merge of overschrijving.`
      )
      return
    }
    if (
      !window.confirm(
        `Draft publiceren als live v${(pd.published?.version ?? 0) + 1}? De huidige liveversie wordt vervangen.`
      )
    ) {
      return
    }
    await runAction("Publiceren mislukt", async () => {
      const { category } = await publishCmsCategoryDraft(slug, {
        confirm: true,
        expected_draft_revision: pd.draft!.revision,
      })
      applyCategory(category, "draft")
      setOk("Gepubliceerd. Status: Draft – gelijk aan live.")
    })
  }

  async function rebaseDraft(mode: "keep_draft_content" | "replace_with_live") {
    if (!pd?.draft || !pd.published) return
    const liveV = pd.published.version
    const baseV = pd.draft.base_version
    if (mode === "keep_draft_content") {
      if (
        !window.confirm(
          `Rebase: draft behouden, basis bijwerken van v${baseV} naar live v${liveV}. Live-wijzigingen sinds v${baseV} worden niet gemerged.`
        )
      ) {
        return
      }
    } else if (
      !window.confirm(
        `Let op: draftinhoud wordt vervangen door live v${liveV}. Huidige draftwijzigingen gaan verloren.`
      )
    ) {
      return
    }
    await runAction("Rebase mislukt", async () => {
      const { category } = await rebaseCmsCategoryDraft(slug, {
        mode,
        expected_draft_revision: pd.draft!.revision,
        acknowledge_unmerged_live: mode === "keep_draft_content",
        confirm_destroy_draft_changes: mode === "replace_with_live",
      })
      applyCategory(category, "draft")
      setOk(
        mode === "keep_draft_content"
          ? `Draft behouden; basis nu v${liveV}.`
          : `Draft vervangen door live v${liveV}.`
      )
    })
  }

  async function createDraftFromLiveOrEmpty() {
    await runAction("Draft aanmaken mislukt", async () => {
      const hasDraft = Boolean(pd?.draft)
      if (hasDraft) {
        if (
          !window.confirm(
            "Er bestaat al een draft. Overschrijven met de huidige liveversie? Huidige draftwijzigingen gaan verloren."
          )
        ) {
          return
        }
      }
      const from = pd?.published ? "published" : "empty"
      const { category } = await createCmsCategoryDraft(slug, {
        from,
        overwrite: hasDraft,
      })
      applyCategory(category, "draft")
      setOk(
        from === "published"
          ? "Draft aangemaakt vanuit live."
          : "Lege draft aangemaakt."
      )
    })
  }

  const hasLive = Boolean(pd?.published)
  const hasDraft = Boolean(pd?.draft)
  const readOnly = viewMode === "published" || !hasDraft
  const statusExtra = pd
    ? [
        viewMode === "published" ? "Bekijkt gepubliceerd" : "Bekijkt draft",
        hasLive ? `Live v${pd.published!.version}` : "Geen live",
        draftStatusLabel(pd),
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined
  const hero = doc ? getBlock(doc, "hero") : null
  const title = hero?.title[locale] || hero?.title.nl || slug
  const remaining = doc && profile ? optionalBlocksToAdd(doc, profile) : []

  const structure = useMemo(() => {
    if (!doc || !profile) {
      return [
        { id: "chrome_header", label: "Header", hint: "Centraal beheerd", locked: true },
        { id: "chrome_footer", label: "Footer", hint: "Centraal beheerd", locked: true },
      ]
    }
    return [
      { id: "chrome_header", label: "Header", hint: "Centraal beheerd", locked: true },
      ...doc.blocks.map((block) => ({
        id: block.id,
        label: CATEGORY_CMS_BLOCK_LABEL[block.type],
        hint: isRequiredCategoryBlock(profile, block.type) ? "Vast blok" : "Optioneel",
        visible: block.visible,
        locked: isRequiredCategoryBlock(profile, block.type),
      })),
      { id: "chrome_footer", label: "Footer", hint: "Centraal beheerd", locked: true },
      { id: "seo", label: "SEO", hint: "Metadata", locked: true },
    ]
  }, [doc, profile])

  const previewDocument = useMemo(() => {
    if (!doc) return {}
    return syncLegacyMirrors(doc, doc as unknown as Record<string, unknown>)
  }, [doc])

  const toolbarActions = (
    <>
      {viewMode === "published" ? (
        <Button variant="secondary" disabled={busy || !profile} onClick={() => void createDraftFromLiveOrEmpty()}>
          {hasDraft ? "Draft opnieuw vanuit live" : "Draft aanmaken vanuit live"}
        </Button>
      ) : (
        <>
          {!hasDraft ? (
            <Button variant="secondary" disabled={busy || !profile} onClick={() => void createDraftFromLiveOrEmpty()}>
              Draft aanmaken
            </Button>
          ) : (
            <>
              <Button variant="secondary" disabled={busy || !doc} onClick={() => void saveDraft()}>
                Draft opslaan
              </Button>
              <Button disabled={busy} onClick={() => void publishDraft()}>
                Publiceren
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void removeDraft()}>
                Draft verwijderen
              </Button>
            </>
          )}
          {hasDraft ? (
            <Button
              variant="secondary"
              disabled={busy || !profile}
              onClick={() =>
                void runAction("Voorstellen genereren mislukt", async () => {
                  await generateCmsCategoryProposals(slug)
                  setProposalRefresh((value) => value + 1)
                  setOk("Voorstellen bijgewerkt. De draft is niet gepubliceerd.")
                })
              }
            >
              Voorstellen genereren
            </Button>
          ) : null}
          {pd?.stale_base && hasDraft && hasLive ? (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => void rebaseDraft("keep_draft_content")}>
                Rebase: draft behouden
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void rebaseDraft("replace_with_live")}>
                Rebase: vervang door live
              </Button>
            </>
          ) : null}
        </>
      )}
    </>
  )

  return (
    <CmsEditorShell
      breadcrumb={
        <CmsBreadcrumb
          items={[
            { href: "/cms", label: "CMS" },
            { href: "/cms/categories", label: "Categorieën" },
            { label: slug },
          ]}
        />
      }
      title={title}
      templateLabel={profile ? CATEGORY_CMS_PROFILE_LABEL[profile] : "Categoriepagina"}
      published={viewMode === "published" && hasLive}
      statusExtra={statusExtra}
      busy={busy}
      error={
        pd?.stale_base && viewMode === "draft"
          ? [
              error,
              `Verouderde basis: draft v${pd.draft?.base_version ?? "—"} vs live v${pd.published?.version ?? "—"}. Publiceren geblokkeerd tot rebase.`,
            ]
              .filter(Boolean)
              .join(" ")
          : error
      }
      ok={ok}
      viewport={viewport}
      onViewport={setViewport}
      onSaveDraft={() => void saveDraft()}
      onPublish={() => void publishDraft()}
      modeTabs={[
        { id: "published", label: "Gepubliceerd" },
        { id: "draft", label: "Draft" },
      ]}
      activeModeTab={viewMode}
      onModeTab={(id) => switchMode(id as ViewMode)}
      toolbarActions={toolbarActions}
      settingsReadOnly={readOnly}
      structure={structure}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onMove={
        readOnly || !doc || !profile
          ? undefined
          : (id, direction) => setDoc(moveOptionalCategoryBlock(doc, id, direction, profile))
      }
      onToggleVisible={
        readOnly || !doc
          ? undefined
          : (id) => {
              const block = doc.blocks.find((item) => item.id === id)
              if (!block) return
              setDoc(updateCategoryBlock(doc, id, { visible: !block.visible }))
            }
      }
      onRemove={
        readOnly || !doc || !profile
          ? undefined
          : (id) => setDoc(removeOptionalCategoryBlock(doc, id, profile))
      }
      onAddSection={
        readOnly || remaining.length === 0 ? undefined : () => setSelectedId("__add")
      }
      addLabel="Optioneel blok toevoegen"
      childrenPreview={
        <div className="flex h-full min-h-0 flex-col">
          <p className="mb-2 text-[11px] text-wf-600">
            {viewMode === "published" ? "Gepubliceerde preview" : "Draft-preview"} ·{" "}
            {viewport === "desktop" ? "Desktop" : viewport === "tablet" ? "Tablet" : "Mobiel"}.
            De openbare site blijft beperkt tot gepubliceerde producten met een verkoopbaar aanbod.
          </p>
          {viewMode === "draft" ? (
            <label className="mb-2 flex items-center gap-2 text-[11px] text-wf-700">
              <input
                type="checkbox"
                checked={showConcepts}
                onChange={(event) => setShowConcepts(event.target.checked)}
              />
              Toon conceptproducten
            </label>
          ) : null}
          <div className="min-h-0 flex-1">
            <CmsLivePreview
              kind="category"
              path={`/cms-preview/category/${encodeURIComponent(slug)}`}
              viewport={viewport}
              locale={locale}
              selectedId={doc ? previewSectionForBlock(doc, selectedId) : selectedId}
              document={previewDocument}
              slug={slug}
              previewProducts={
                viewMode === "draft" && showConcepts ? conceptProducts ?? [] : viewMode === "draft" ? [] : undefined
              }
              banners={banners}
              theme={null}
              onSelect={(sectionId) => {
                if (!doc) return
                setSelectedId(blockIdForPreviewSection(doc, sectionId))
              }}
            />
          </div>
        </div>
      }
      childrenSettings={
        doc ? (
          <>
            <CmsCategoryBlockSettings
              slug={slug}
              doc={doc}
              selectedId={selectedId}
              meta={meta}
              setMeta={setMeta}
              banners={banners}
              onDoc={setDoc}
              onError={setError}
            />
            <CmsCategoryProposals
              slug={slug}
              doc={doc}
              selectedId={selectedId}
              locale={locale}
              readOnly={readOnly}
              draftRevision={pd?.draft?.revision ?? null}
              refreshKey={proposalRefresh}
              onError={setError}
              onAccepted={async () => {
                await reload("draft")
                setProposalRefresh((value) => value + 1)
                setOk("Voorstel in de draft gezet. Nog niet gepubliceerd.")
              }}
            />
          </>
        ) : (
          <p className="text-sm text-wf-600">
            {profile
              ? "Maak een draft aan om de blokken van dit profiel te bewerken."
              : "Deze slug heeft geen bruikbaar categorieprofiel in de taxonomie."}
          </p>
        )
      }
    />
  )
}

export function CmsCategoryStudio({ slug }: { slug: string }) {
  const excluded = categoryCmsListExclusion({ slug, name: slug })
  if (excluded) {
    return (
      <div className="mx-auto max-w-xl space-y-3 p-6">
        <h1 className="text-xl font-bold text-wf-950">{slug}</h1>
        <p className="text-sm text-wf-700">{excluded}</p>
        <a href="/cms/categories" className="text-sm font-semibold text-sky-800 underline">
          Terug naar de actieve lijst
        </a>
      </div>
    )
  }
  return (
    <CmsLocaleProvider>
      <Inner slug={slug} />
    </CmsLocaleProvider>
  )
}
