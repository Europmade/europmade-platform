/**
 * Shared brief for a level-1 subcategory photograph.
 * The subject comes from the category name, its parent and its description.
 * There is no scene assigned to a slug.
 */
export type CategoryTileImageSubject = {
  name: string
  parentName?: string | null
  description?: string | null
}

function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

export function categoryTilePublicPath(slug: string): string | null {
  const key = slug.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) return null
  return `/category/tiles/${key}.jpg`
}

export function categoryTileImageBrief(subject: CategoryTileImageSubject): string {
  const name = clean(subject.name)
  if (!name) return ""
  const parent = clean(subject.parentName)
  const description = clean(subject.description)
  const place = parent ? `binnen ${parent}` : "op EuropMade"
  const meaning = description
    ? `Betekenis: ${description}`
    : "Leid het product af uit de categorienaam en verzin geen ander product."
  return [
    `Sfeerfoto voor de categorie “${name}” ${place}.`,
    meaning,
    "Eén herkenbaar, merkneutraal product of productsoort, natuurlijk in de ruimte waar het wordt gebruikt.",
    "Warm natuurlijk daglicht, Europese woning, hout en textiel, zachte contrasten, lichte uitnodigende ruimte, natuurlijke kleurverzadiging.",
    "Geen grauwe of koele sfeer, geen overbelichting, geen harde witte studio-achtergrond, geen klinische productfoto, geen collage, geen merkteken, geen logo en geen letters of cijfers op het apparaat.",
    "Houd het product in het midden, zodat een brede uitsnede het nog toont.",
  ].join(" ")
}
