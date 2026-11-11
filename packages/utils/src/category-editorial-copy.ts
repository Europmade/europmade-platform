import {
  categoryCmsBlockId,
  categoryCmsLocalizedHasText,
  createCategoryCmsOptionalBlock,
  getBlock,
  isUspSlotManualOverride,
  syncLegacyMirrors,
  type CategoryCmsDocumentV2,
  type CategoryCmsLocalized,
  type CategoryCmsProfile,
} from "./cms-category-document"
import { consumerUspPairs } from "./category-consumer-copy"

export type CategoryEditorialContext = {
  slug: string
  name: string
  parentName: string | null
  children: Array<{ slug: string; name: string }>
  profile: CategoryCmsProfile
  productCount: number | null
  brands: string[]
  filterNames: string[]
  /** Other parent that has a category with the same display name. */
  distinguishedFrom: string | null
}

const LOCALES = ["nl", "en", "de", "fr"] as const

function line(nl: string, en: string, de: string, fr: string): CategoryCmsLocalized {
  return { nl, en, de, fr }
}

function blank(value: CategoryCmsLocalized | null | undefined): boolean {
  return !categoryCmsLocalizedHasText(value)
}

function joinList(names: string[], andWord: string): string {
  const clean = names.map((name) => name.trim()).filter(Boolean)
  if (clean.length === 0) return ""
  if (clean.length === 1) return clean[0]!
  return `${clean.slice(0, -1).join(", ")} ${andWord} ${clean[clean.length - 1]}`
}

function hasAnyCopy(doc: CategoryCmsDocumentV2): boolean {
  const seen = new Set<unknown>()
  function walk(value: unknown): boolean {
    if (!value || typeof value !== "object" || seen.has(value)) return false
    seen.add(value)
    if (LOCALES.every((locale) => typeof (value as Record<string, unknown>)[locale] === "string")) {
      return categoryCmsLocalizedHasText(value as CategoryCmsLocalized)
    }
    if (Array.isArray(value)) return value.some((item) => walk(item))
    return Object.values(value as Record<string, unknown>).some((item) => walk(item))
  }
  return walk(doc.blocks) || walk(doc.seo)
}

function setText(
  filled: string[],
  key: string,
  current: CategoryCmsLocalized,
  next: CategoryCmsLocalized
): CategoryCmsLocalized {
  if (!blank(current)) return current
  filled.push(key)
  return next
}

function countSentence(name: string, count: number | null): CategoryCmsLocalized | null {
  if (count == null) return null
  if (count === 0) {
    return line(
      `Er zijn nog geen producten aan ${name} gekoppeld.`,
      `No products are linked to ${name} yet.`,
      `Mit ${name} sind noch keine Produkte verknüpft.`,
      `Aucun produit n'est encore lié à ${name}.`
    )
  }
  if (count === 1) {
    return line(
      `Er is 1 product aan ${name} gekoppeld.`,
      `1 product is linked to ${name}.`,
      `Mit ${name} ist 1 Produkt verknüpft.`,
      `1 produit est lié à ${name}.`
    )
  }
  return line(
    `Er zijn ${count} producten aan ${name} gekoppeld.`,
    `${count} products are linked to ${name}.`,
    `Mit ${name} sind ${count} Produkte verknüpft.`,
    `${count} produits sont liés à ${name}.`
  )
}

/**
 * Fills empty draft fields from the category tree and real assortment facts.
 * A field that already has text, and a manually overridden USP slot, stay as they are.
 * Nothing is published.
 */
export function fillEmptyCategoryEditorial(
  doc: CategoryCmsDocumentV2,
  context: CategoryEditorialContext
): { document: CategoryCmsDocumentV2; filled: string[] } {
  if (doc.profile !== context.profile) return { document: doc, filled: [] }
  const filled: string[] = []
  const next = structuredClone(doc)
  const shell = !hasAnyCopy(doc)
  const name = context.name.trim()
  const parent = context.parentName?.trim() || null
  const children = context.children.filter((child) => child.slug && child.name.trim())
  const childList = {
    nl: joinList(children.map((child) => child.name), "en"),
    en: joinList(children.map((child) => child.name), "and"),
    de: joinList(children.map((child) => child.name), "und"),
    fr: joinList(children.map((child) => child.name), "et"),
  }
  const combo = ["wasmachines", "wasdrogers", "was-droogcombinaties"].every((slug) =>
    children.some((child) => child.slug === slug)
  )
  const counts = countSentence(name, context.productCount)
  const brands = context.brands.map((brand) => brand.trim()).filter(Boolean).slice(0, 8)
  const filters = context.filterNames.map((item) => item.trim()).filter(Boolean).slice(0, 6)

  const hero = getBlock(next, "hero")
  if (hero) {
    hero.title = setText(filled, "hero.title", hero.title, line(name, name, name, name))
    const intro = line(
      [
        parent ? `${name} hoort bij ${parent}.` : `${name} is een categorie op EuropMade.`,
        childList.nl ? `Je gaat verder via ${childList.nl}.` : counts?.nl ?? "",
        combo
          ? "Een was-droogcombinatie hoort bij Was-droogcombinaties en niet ook bij Wasmachines of Wasdrogers."
          : "",
        context.distinguishedFrom
          ? `${name} onder ${parent || "deze categorie"} is een andere groep dan ${name} onder ${context.distinguishedFrom}.`
          : "",
        brands.length ? `Gekoppelde merken: ${joinList(brands, "en")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
      [
        parent ? `${name} sits under ${parent}.` : `${name} is a category on EuropMade.`,
        childList.en ? `Continue via ${childList.en}.` : counts?.en ?? "",
        combo
          ? "A washer-dryer belongs with washer-dryers, not also with washing machines or dryers."
          : "",
        context.distinguishedFrom
          ? `${name} under ${parent || "this category"} is a different group from ${name} under ${context.distinguishedFrom}.`
          : "",
        brands.length ? `Linked brands: ${joinList(brands, "and")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
      [
        parent ? `${name} gehört zu ${parent}.` : `${name} ist eine Kategorie auf EuropMade.`,
        childList.de ? `Weiter geht es über ${childList.de}.` : counts?.de ?? "",
        combo
          ? "Ein Waschtrockner gehört zu Waschtrocknern und nicht zusätzlich zu Waschmaschinen oder Trocknern."
          : "",
        context.distinguishedFrom
          ? `${name} unter ${parent || "dieser Kategorie"} ist eine andere Gruppe als ${name} unter ${context.distinguishedFrom}.`
          : "",
        brands.length ? `Verknüpfte Marken: ${joinList(brands, "und")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
      [
        parent ? `${name} fait partie de ${parent}.` : `${name} est une catégorie sur EuropMade.`,
        childList.fr ? `La suite se trouve via ${childList.fr}.` : counts?.fr ?? "",
        combo
          ? "Un lave-linge séchant appartient aux lave-linge séchants, et non aussi aux lave-linge ou aux sèche-linge."
          : "",
        context.distinguishedFrom
          ? `${name} sous ${parent || "cette catégorie"} est un autre groupe que ${name} sous ${context.distinguishedFrom}.`
          : "",
        brands.length ? `Marques liées : ${joinList(brands, "et")}.` : "",
      ]
        .filter(Boolean)
        .join(" ")
    )
    hero.intro = setText(filled, "hero.intro", hero.intro, intro)
    if (blank(hero.subtitle)) {
      const subtitle =
        context.profile === "level_1"
          ? `Vind het juiste onderdeel binnen ${name}.`
          : context.profile === "level_2"
            ? parent
              ? `${name} hoort bij ${parent}. Kies hier een productgroep.`
              : `Kies een productgroep binnen ${name}.`
            : parent
              ? `Vergelijk ${name} binnen ${parent}.`
              : `Vergelijk ${name}.`
      hero.subtitle = { nl: subtitle, en: "", de: "", fr: "" }
      filled.push("hero.subtitle")
    }
    if (blank(hero.secondary_cta_label)) {
      const choice = getBlock(next, "choice_assistant_cta")
      const tiles = getBlock(next, "subcategory_tiles") ?? getBlock(next, "product_group_tiles")
      const target = choice?.id ?? tiles?.id ?? ""
      if (target) {
        hero.secondary_cta_label = {
          nl: choice ? "Keuzehulp" : "Bekijk de groepen",
          en: "",
          de: "",
          fr: "",
        }
        if (!hero.secondary_cta_href?.trim()) hero.secondary_cta_href = `#${target}`
        filled.push("hero.secondary_cta")
      }
    }
    if (shell) {
      const tiles = getBlock(next, "subcategory_tiles") ?? getBlock(next, "product_group_tiles")
      const grid = getBlock(next, "product_grid")
      const target = tiles?.id ?? grid?.id ?? ""
      if (blank(hero.primary_cta_label) && target) {
        hero.primary_cta_label = line(
          context.profile === "level_3" ? "Bekijk de producten" : "Bekijk de groepen",
          context.profile === "level_3" ? "View the products" : "View the groups",
          context.profile === "level_3" ? "Produkte ansehen" : "Gruppen ansehen",
          context.profile === "level_3" ? "Voir les produits" : "Voir les groupes"
        )
        hero.primary_cta_href = `#${target}`
        filled.push("hero.primary_cta")
      }
    }
  }

  const usp = getBlock(next, "usp_bar")
  if (usp) {
    const meta = next.block_meta[usp.id]
    const pairs = consumerUspPairs(context)
    usp.slots.forEach((slot, index) => {
      if (isUspSlotManualOverride(meta, index)) return
      const pair = pairs[index]
      if (!pair) return
      if (blank(slot.title)) {
        slot.title = line(pair.title, "", "", "")
        filled.push(`usp.${index}.title`)
      }
      if (blank(slot.body)) {
        slot.body = line(pair.body, "", "", "")
        filled.push(`usp.${index}.body`)
      }
    })
  }

  for (const type of ["subcategory_tiles", "product_group_tiles", "product_carousel", "product_grid", "brand_overview"] as const) {
    const block = getBlock(next, type)
    if (!block || !("title" in block)) continue
    const title = line(
      type === "brand_overview" ? `Merken in ${name}` : type === "product_carousel" || type === "product_grid" ? `Producten in ${name}` : `Groepen in ${name}`,
      type === "brand_overview" ? `Brands in ${name}` : type === "product_carousel" || type === "product_grid" ? `Products in ${name}` : `Groups in ${name}`,
      type === "brand_overview" ? `Marken in ${name}` : type === "product_carousel" || type === "product_grid" ? `Produkte in ${name}` : `Gruppen in ${name}`,
      type === "brand_overview" ? `Marques dans ${name}` : type === "product_carousel" || type === "product_grid" ? `Produits dans ${name}` : `Groupes dans ${name}`
    )
    block.title = setText(filled, `${type}.title`, block.title, title)
  }

  const choice = getBlock(next, "choice_assistant_cta")
  if (choice) {
    choice.title = setText(
      filled,
      "choice.title",
      choice.title,
      line(
        `Kiezen binnen ${name}`,
        `Choose within ${name}`,
        `Wählen in ${name}`,
        `Choisir dans ${name}`
      )
    )
    choice.body = setText(
      filled,
      "choice.body",
      choice.body,
      line(
        "De keuzehulp gebruikt alleen specificaties die bij minstens twee producten hetzelfde soort waarde hebben. Ontbreekt die informatie, dan verschijnt er geen vraag.",
        "The choice assistant only uses specifications that share a value on at least two products. If that information is missing, no question appears.",
        "Die Auswahlhilfe nutzt nur Angaben, die bei mindestens zwei Produkten einen vergleichbaren Wert haben. Fehlt das, erscheint keine Frage.",
        "L'aide au choix n'utilise que des caractéristiques présentes avec une valeur comparable sur au moins deux produits. Sinon, aucune question n'apparaît."
      )
    )
  }

  const advice = getBlock(next, "advice_compare")
  if (advice && shell && advice.items.length === 0 && children.length > 0) {
    advice.title = line(
      `Productgroepen in ${name}`,
      `Product groups in ${name}`,
      `Produktgruppen in ${name}`,
      `Groupes de produits dans ${name}`
    )
    advice.items = children.slice(0, 3).map((child) => ({
      id: `adv_${context.profile}_${child.slug}`.replace(/[^a-z0-9_-]/gi, "").slice(0, 48),
      label: line(child.name, child.name, child.name, child.name),
      href: `/categorie/${child.slug}`,
      summary: line(
        `Open de pagina ${child.name}. Daar staan de producten die aan die groep zijn gekoppeld.`,
        `Open the ${child.name} page. It shows the products linked to that group.`,
        `Öffne die Seite ${child.name}. Dort stehen die Produkte, die mit dieser Gruppe verknüpft sind.`,
        `Ouvrez la page ${child.name}. Elle montre les produits liés à ce groupe.`
      ),
    }))
    filled.push("advice.items")
  }

  const why = getBlock(next, "why_europmade")
  if (why) {
    why.title = setText(
      filled,
      "why.title",
      why.title,
      line("Waarom EuropMade?", "Why EuropMade?", "Warum EuropMade?", "Pourquoi EuropMade ?")
    )
    why.body = setText(
      filled,
      "why.body",
      why.body,
      line(
        `Op ${name} vergelijkt EuropMade het aanbod van verkopers. EuropMade verkoopt zelf geen producten en vult geen herkomst, keurmerk of garantie in die niet bij het product is vastgelegd.`,
        `On ${name}, EuropMade compares sellers' offers. EuropMade does not sell products itself and does not add origin, certification or warranty claims that are not stored on the product.`,
        `Bei ${name} vergleicht EuropMade die Angebote der Verkäufer. EuropMade verkauft selbst keine Produkte und ergänzt keine Herkunfts-, Zertifikats- oder Garantieaussagen, die nicht am Produkt hinterlegt sind.`,
        `Sur ${name}, EuropMade compare les offres des vendeurs. EuropMade ne vend pas lui-même de produits et n'ajoute pas d'allégation d'origine, de label ou de garantie qui n'est pas enregistrée sur le produit.`
      )
    )
  }

  const guide = getBlock(next, "buying_guide")
  if (guide && shell && guide.sections.length === 0 && guide.faq.length === 0) {
    guide.title = line(
      `Koopgids ${name}`,
      `Buying guide ${name}`,
      `Kaufberatung ${name}`,
      `Guide d'achat ${name}`
    )
    guide.intro = counts ?? line(
      `Deze gids beschrijft alleen hoe de pagina ${name} is opgebouwd.`,
      `This guide only describes how the ${name} page is organised.`,
      `Dieser Ratgeber beschreibt nur den Aufbau der Seite ${name}.`,
      `Ce guide décrit seulement l'organisation de la page ${name}.`
    )
    guide.sections = [
      {
        id: `gde_${doc.profile}_offer`,
        heading: line("Aanbod", "Offer", "Angebot", "Offre"),
        body: line(
          "Een prijs, een voorraad en een levertijd komen van een verkoopbaar aanbod. Zonder dat aanbod blijft de productkaart zonder prijs en zonder winkelwagen.",
          "A price, stock level and delivery time come from a sellable offer. Without that offer the product card has no price and no cart.",
          "Preis, Bestand und Lieferzeit stammen aus einem verkaufbaren Angebot. Ohne dieses Angebot bleiben Preis und Warenkorb leer.",
          "Un prix, un stock et un délai viennent d'une offre vendable. Sans cette offre, la fiche n'a ni prix ni panier."
        ),
        bullets: [],
      },
    ]
    if (filters.length) {
      guide.sections.push({
        id: `gde_${doc.profile}_filters`,
        heading: line("Filters", "Filters", "Filter", "Filtres"),
        body: line(
          `Je kunt filteren op ${joinList(filters, "en")}. Een filter verschijnt alleen als een gekoppeld product die specificatie heeft. De tabel markeert geen betere waarde.`,
          `You can filter on ${joinList(filters, "and")}. A filter appears only when a linked product has that specification. The table does not mark a better value.`,
          `Du kannst nach ${joinList(filters, "und")} filtern. Ein Filter erscheint nur, wenn ein verknüpftes Produkt diese Angabe hat. Die Tabelle markiert keinen besseren Wert.`,
          `Vous pouvez filtrer sur ${joinList(filters, "et")}. Un filtre n'apparaît que si un produit lié possède cette caractéristique. Le tableau ne marque pas une meilleure valeur.`
        ),
        bullets: [],
      })
    }
    filled.push("buying_guide")
  }

  if (shell && context.profile === "level_2" && !getBlock(next, "brand_overview")) {
    const created = createCategoryCmsOptionalBlock(context.profile, "brand_overview", { slug: context.slug })
    if (created) {
      next.blocks.push(created)
      next.block_meta[created.id] = {
        source: "product_cloud",
        dynamic: true,
        ai_may_propose: false,
        manual_override: false,
        approval_required: true,
        content_version: "v2",
      }
      filled.push("brand_overview")
    }
  }
  if (shell && !getBlock(next, "faq")) {
    const created = createCategoryCmsOptionalBlock(doc.profile, "faq", { slug: context.slug })
    if (created && created.type === "faq") {
      created.id = categoryCmsBlockId(context.slug, doc.profile, "faq")
      next.blocks.push(created)
      next.block_meta[created.id] = {
        source: "cms",
        dynamic: false,
        ai_may_propose: true,
        manual_override: false,
        approval_required: true,
        content_version: "v2",
      }
    }
  }
  const faq = getBlock(next, "faq")
  if (faq && shell && faq.items.length === 0) {
    faq.title = line("Vragen", "Questions", "Fragen", "Questions")
    faq.items = [
      {
        id: `faq_${doc.profile}_seller`,
        question: line(
          "Verkoopt EuropMade deze producten zelf?",
          "Does EuropMade sell these products itself?",
          "Verkauft EuropMade diese Produkte selbst?",
          "EuropMade vend-il lui-même ces produits ?"
        ),
        answer: line(
          "Nee. EuropMade verkoopt zelf geen producten. Een prijs staat er alleen als een verkoper een verkoopbaar aanbod heeft.",
          "No. EuropMade does not sell products itself. A price appears only when a seller has a sellable offer.",
          "Nein. EuropMade verkauft selbst keine Produkte. Ein Preis steht nur da, wenn ein Verkäufer ein verkaufbares Angebot hat.",
          "Non. EuropMade ne vend pas lui-même de produits. Un prix n'apparaît que lorsqu'un vendeur a une offre vendable."
        ),
      },
    ]
    if (childList.nl) {
      faq.items.push({
        id: `faq_${doc.profile}_groups`,
        question: line(
          `Welke groepen horen bij ${name}?`,
          `Which groups belong to ${name}?`,
          `Welche Gruppen gehören zu ${name}?`,
          `Quels groupes appartiennent à ${name} ?`
        ),
        answer: line(childList.nl, childList.en, childList.de, childList.fr),
      })
    }
    if (context.distinguishedFrom && parent) {
      faq.items.push({
        id: `faq_${doc.profile}_distinct`,
        question: line(
          `Is dit dezelfde groep als ${name} onder ${context.distinguishedFrom}?`,
          `Is this the same group as ${name} under ${context.distinguishedFrom}?`,
          `Ist das dieselbe Gruppe wie ${name} unter ${context.distinguishedFrom}?`,
          `Est-ce le même groupe que ${name} sous ${context.distinguishedFrom} ?`
        ),
        answer: line(
          `Nee. Deze pagina is ${name} onder ${parent}.`,
          `No. This page is ${name} under ${parent}.`,
          `Nein. Diese Seite ist ${name} unter ${parent}.`,
          `Non. Cette page est ${name} sous ${parent}.`
        ),
      })
    }
    filled.push("faq")
  }

  next.seo.title = setText(
    filled,
    "seo.title",
    next.seo.title,
    line(
      parent ? `${name} | ${parent} | EuropMade` : `${name} | EuropMade`,
      parent ? `${name} | ${parent} | EuropMade` : `${name} | EuropMade`,
      parent ? `${name} | ${parent} | EuropMade` : `${name} | EuropMade`,
      parent ? `${name} | ${parent} | EuropMade` : `${name} | EuropMade`
    )
  )
  next.seo.meta_description = setText(
    filled,
    "seo.description",
    next.seo.meta_description,
    line(
      `${name}${parent ? ` binnen ${parent}` : ""} op EuropMade. ${counts?.nl ?? "Producten verschijnen hier zodra ze aan deze categorie zijn gekoppeld."}`.slice(0, 160),
      `${name}${parent ? ` within ${parent}` : ""} on EuropMade. ${counts?.en ?? "Products appear here once they are linked to this category."}`.slice(0, 160),
      `${name}${parent ? ` in ${parent}` : ""} auf EuropMade. ${counts?.de ?? "Produkte erscheinen hier, sobald sie mit dieser Kategorie verknüpft sind."}`.slice(0, 160),
      `${name}${parent ? ` dans ${parent}` : ""} sur EuropMade. ${counts?.fr ?? "Les produits apparaissent ici dès qu'ils sont liés à cette catégorie."}`.slice(0, 160)
    )
  )
  next.seo.h1 = setText(filled, "seo.h1", next.seo.h1, line(name, name, name, name))

  if (filled.length === 0) return { document: doc, filled }
  return { document: syncLegacyMirrors(next), filled }
}

/**
 * Marks a draft for editorial review after the assortment changes.
 * Block text is left untouched. A draft without text is not marked.
 */
export function noteCategoryAssortmentChange(
  doc: CategoryCmsDocumentV2,
  notedAt: string
): { document: CategoryCmsDocumentV2; changed: boolean } {
  if (doc.editorial_review?.needed) return { document: doc, changed: false }
  if (!hasAnyCopy(doc)) return { document: doc, changed: false }
  return {
    changed: true,
    document: {
      ...doc,
      editorial_review: {
        needed: true,
        reason: "assortment_changed",
        noted_at: notedAt,
      },
    },
  }
}
