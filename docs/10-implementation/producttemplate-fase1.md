# Producttemplate CMS — Fase 1

## Architectuur

```
Product Cloud / Commerce Cloud     → masterdata & commerce (naam, prijs, media, offers, …)
Seller Backoffice                  → seller-specifieke content (waarom, gebruik, FAQ, geschikt-voor, …)
CMS Producttemplate / product-CMS  → presentatie, zichtbaarheid, interim redactionele overlays
resolveProductPage                 → template ⊕ product-override → PDP
Storefront ProductDetailPage       → rendering
```

CMS beheert **niet** opnieuw: naam, merk, SKU, EAN, prijs, voorraad, productafbeeldingen, varianten, seller-specificaties.

## Introductie (max 320)

- Korte samenvatting; plain text; HTML gestrippt; woordgrens-truncate.
- Resolve: CMS-intro of (bij zichtbaar + leeg CMS) Product Cloud `detail.intro` — **altijd** via `truncateAtWordBoundary`.
- `introVisible=false` → geen intro, geen PC-fallback.
- Volledige productomschrijving blijft in **Omschrijving / tabs** (`descriptionParagraphs` / `descriptionHtml`).

## Seller ownership — Waarom / Gebruik / FAQ

| Sectie | Structuur (EuropMade) | Inhoud (Seller) |
| --- | --- | --- |
| Waarom dit product? | visibility + PDP-sectie | seller-tekst (CMS interim tot seller BO) |
| Gebruik & toepassing | visibility + PDP-sectie | seller-tekst (CMS interim) |
| FAQ | één sectie “Veelgestelde vragen” | `sellerFaqs` (general + product) + interim product-CMS FAQ |

Geen EuropMade-platform-FAQ of hardcoded why/usage als fallback.

### FAQ-model (toekomstbestendig)

```ts
PdpSellerFaq = { id, scope: "general" | "product", q, a }
```

Resolve: `mergeSellerFaqs({ sellerFaqs, productCmsFaqs })` → één flat list  
Volgorde: general → product → product-CMS. Zelfde `id` één keer. Lege Q/A weg.

Seller BO (buiten Fase 1): algemene FAQ koppelen aan meerdere producten; product-FAQ per product.

## Template inheritance

1. Globale template: `cms_product.product_id = "template"`
2. Optionele product-override (sparse JSON)
3. `mergeProductEditorialFromRaw` + `resolveProductPage`
4. Preview = live resolve (`preview: true` alleen voor unpublished banners)

## Wat CMS beheert (Fase 1)

| Onderdeel | CMS |
| --- | --- |
| Gallery / Buy Box toggles | Presentatie |
| Trust / USP-badges (Veilig betalen, …) | Visibility (EuropMade-platformteksten via i18n) |
| Intro (≤320, plain) | Overlay + visibility |
| USP-titels | Overlay + visibility |
| Waarom / Gebruik | Visibility + interim content |
| descriptionHtml / tabs visibility | Overlay / presentatie |
| FAQ | Visibility + interim product-FAQ |
| Banner / SEO | Presentatie / metadata |

## Wat Seller Backoffice moet gaan beheren

- Waarom / Gebruik / FAQ (general + product)
- Geschikt voor
- Dynamische specificaties/attributen

## Centrale code

- `@europmade/utils`: editorial, intro, sanitize
- `apps/web/app/_lib/cms/resolve-product-page.ts` (`mergeSellerFaqs`)
- Admin: `cms-product-studio.tsx`

## Bewust buiten scope

- Drag-and-drop reorder, TipTap, volledige seller FAQ-manager
- MFA, orders, finance, affiliate, moderation
- Nieuwe bannerarchitectuur / DB-migratie

## Migrations

Geen — JSON `cms_product.document` is backward compatible.
