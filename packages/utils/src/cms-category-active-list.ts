/**
 * Categories that stay in Product Cloud but are not part of the active Category CMS list.
 * Rows, product links and CMS documents are left untouched.
 */
export function categoryCmsListExclusion(category: {
  name?: string | null
  slug?: string | null
}): string | null {
  const slug = (category.slug ?? "").trim().toLowerCase()
  const name = (category.name ?? "").trim()
  if (slug === "mode" || name.toLowerCase() === "mode") {
    return "Legacy-root buiten de canonieke winkelboom. De categorie en haar productkoppelingen blijven in Product Cloud."
  }
  if (slug === "e2e-cat" || /^e2e(\b|[-_ ])/i.test(name)) {
    return "Testcategorie. De rij blijft in Product Cloud en heeft geen categoriepagina."
  }
  return null
}
