/**
 * One-shot: ensure the 30 EuropMade slugs as pc_category (parent null).
 * Uses POST /admin/product-cloud/categories + manual translations.
 */
import { execSync } from "node:child_process"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin-e2e@example.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "REDACTED_ADMIN_PASSWORD"

const CANONICAL = [
  { slug: "tuin", name: "Tuin", nl: "Tuin", en: "Garden", de: "Garten", fr: "Jardin" },
  { slug: "elektronica", name: "Elektronica", nl: "Elektronica", en: "Electronics", de: "Elektronik", fr: "Électronique" },
  { slug: "mode", name: "Mode", nl: "Mode", en: "Fashion", de: "Mode", fr: "Mode" },
  { slug: "wonen", name: "Wonen", nl: "Wonen", en: "Home", de: "Wohnen", fr: "Maison" },
  { slug: "sport", name: "Sport", nl: "Sport", en: "Sports", de: "Sport", fr: "Sport" },
  { slug: "voeding", name: "Voeding", nl: "Voeding", en: "Food", de: "Lebensmittel", fr: "Alimentation" },
  { slug: "keuken", name: "Keuken", nl: "Keuken", en: "Kitchen", de: "Küche", fr: "Cuisine" },
  { slug: "huishouden", name: "Huishouden", nl: "Huishouden", en: "Household", de: "Haushalt", fr: "Maison et ménage" },
  { slug: "beauty-verzorging", name: "Beauty & Verzorging", nl: "Beauty & Verzorging", en: "Beauty & Care", de: "Beauty & Pflege", fr: "Beauté & soins" },
  { slug: "baby-kind", name: "Baby & Kind", nl: "Baby & Kind", en: "Baby & Kids", de: "Baby & Kind", fr: "Bébé & enfant" },
  { slug: "speelgoed", name: "Speelgoed", nl: "Speelgoed", en: "Toys", de: "Spielzeug", fr: "Jouets" },
  { slug: "dieren", name: "Dieren", nl: "Dieren", en: "Pets", de: "Tiere", fr: "Animaux" },
  { slug: "klus-gereedschap", name: "Klus & Gereedschap", nl: "Klus & Gereedschap", en: "DIY & Tools", de: "Heimwerken & Werkzeug", fr: "Bricolage & outils" },
  { slug: "auto-motor", name: "Auto & Motor", nl: "Auto & Motor", en: "Auto & Motorbike", de: "Auto & Motorrad", fr: "Auto & moto" },
  { slug: "kantoor", name: "Kantoor", nl: "Kantoor", en: "Office", de: "Büro", fr: "Bureau" },
  { slug: "boeken-media", name: "Boeken & Media", nl: "Boeken & Media", en: "Books & Media", de: "Bücher & Medien", fr: "Livres & médias" },
  { slug: "gezondheid", name: "Gezondheid", nl: "Gezondheid", en: "Health", de: "Gesundheit", fr: "Santé" },
  { slug: "verlichting", name: "Verlichting", nl: "Verlichting", en: "Lighting", de: "Beleuchtung", fr: "Éclairage" },
  { slug: "badkamer", name: "Badkamer", nl: "Badkamer", en: "Bathroom", de: "Badzimmer", fr: "Salle de bain" },
  { slug: "slaapkamer", name: "Slaapkamer", nl: "Slaapkamer", en: "Bedroom", de: "Schlafzimmer", fr: "Chambre" },
  { slug: "outdoor", name: "Outdoor", nl: "Outdoor", en: "Outdoor", de: "Outdoor", fr: "Outdoor" },
  { slug: "duurzaam", name: "Duurzaam", nl: "Duurzaam", en: "Sustainable", de: "Nachhaltig", fr: "Durable" },
  { slug: "cadeaus", name: "Cadeaus", nl: "Cadeaus", en: "Gifts", de: "Geschenke", fr: "Cadeaux" },
  { slug: "juwelen-horloges", name: "Juwelen & Horloges", nl: "Juwelen & Horloges", en: "Jewellery & Watches", de: "Schmuck & Uhren", fr: "Bijoux & montres" },
  { slug: "tassen-accessoires", name: "Tassen & Accessoires", nl: "Tassen & Accessoires", en: "Bags & Accessories", de: "Taschen & Accessoires", fr: "Sacs & accessoires" },
  { slug: "schoenen", name: "Schoenen", nl: "Schoenen", en: "Shoes", de: "Schuhe", fr: "Chaussures" },
  { slug: "plant-bloem", name: "Plant & Bloem", nl: "Plant & Bloem", en: "Plants & Flowers", de: "Pflanzen & Blumen", fr: "Plantes & fleurs" },
  { slug: "feest-seizoen", name: "Feest & Seizoen", nl: "Feest & Seizoen", en: "Party & Seasonal", de: "Feier & Saison", fr: "Fête & saison" },
  { slug: "ambacht", name: "Ambacht", nl: "Ambacht", en: "Craft", de: "Handwerk", fr: "Artisanat" },
  { slug: "algemeen", name: "Algemeen", nl: "Algemeen", en: "General", de: "Allgemein", fr: "Général" },
]

async function api(path, opts = {}) {
  const res = await fetch(`${BACKEND}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.headers || {}),
    },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

const login = await api("/auth/user/emailpass", {
  method: "POST",
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
})
const token = login.body?.token
if (!token) {
  console.error("admin_login_failed", login.status, login.body)
  process.exit(1)
}
const auth = { authorization: `Bearer ${token}` }

const created = []
const existing = []
const failed = []

for (const cat of CANONICAL) {
  const res = await api("/admin/product-cloud/categories", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: cat.name,
      slug: cat.slug,
      parent_category_id: null,
      seed_attributes: false,
    }),
  })
  const row = res.body?.category
  const slug = row?.slug ?? cat.slug
  const id = row?.id
  if (res.status === 201) created.push({ slug, id })
  else if (res.status === 200 && id) existing.push({ slug, id })
  else failed.push({ slug: cat.slug, status: res.status, body: res.body })

  if (!id) continue

  const trans = await api(
    `/admin/product-cloud/translations?entity_type=category&entity_id=${encodeURIComponent(id)}`,
    { headers: auth }
  )
  const have = new Set(
    (trans.body?.translations || [])
      .filter((t) => t.field_name === "name")
      .map((t) => `${t.language_code}:${t.translation_status}`)
  )
  for (const [language_code, value] of [
    ["nl", cat.nl],
    ["en", cat.en],
    ["de", cat.de],
    ["fr", cat.fr],
  ]) {
    const published = have.has(`${language_code}:Gepubliceerd`)
    const any = [...have].some((h) => h.startsWith(`${language_code}:`))
    if (published) continue
    if (any) {
      await api("/admin/product-cloud/translations/publish", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          entity_type: "category",
          entity_id: id,
          field_name: "name",
          language_code,
        }),
      })
      continue
    }
    await api("/admin/product-cloud/translations/manual", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        entity_type: "category",
        entity_id: id,
        field_name: "name",
        language_code,
        value,
        source_language_code: "nl",
        source_value: cat.nl,
        publish: true,
      }),
    })
  }
}

function psql(sql) {
  return execSync(
    `docker exec -i europmade-postgres psql -U europmade -d europmade -t -A -c ${JSON.stringify(sql)}`,
    { encoding: "utf8" }
  ).trim()
}

const slugRows = psql(
  "SELECT slug FROM pc_category WHERE deleted_at IS NULL AND slug IS NOT NULL ORDER BY slug;"
)
const slugs = slugRows ? slugRows.split("\n") : []
const missing = CANONICAL.filter((c) => !slugs.includes(c.slug)).map((c) => c.slug)
const uniqueCheck = psql(
  "SELECT slug, count(*) FROM pc_category WHERE deleted_at IS NULL AND slug IS NOT NULL GROUP BY slug HAVING count(*) > 1;"
)

console.log(
  JSON.stringify(
    {
      created,
      already_existed: existing,
      failed,
      canonical_present: CANONICAL.length - missing.length,
      missing,
      duplicate_slugs: uniqueCheck || null,
    },
    null,
    2
  )
)
if (failed.length || missing.length) process.exit(1)
