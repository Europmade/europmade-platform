/**
 * Desktop rows for a level-1 subcategory grid.
 * The first row stays at most five cards. Later rows stay between four and six
 * when the count allows, so a row is never a single leftover card.
 */
export function level1CategoryTileRows(count: number): number[] {
  if (count <= 0) return []
  if (count <= 5) return [count]
  if (count === 6) return [3, 3]
  if (count === 7) return [4, 3]
  if (count === 8) return [4, 4]
  if (count <= 11) return [5, count - 5]
  return [5, ...level1CategoryTileRows(count - 5)]
}
