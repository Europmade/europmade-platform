import fs from "node:fs"
import path from "node:path"
import { categoryTilePublicPath } from "@europmade/utils"

function tileDirectory(): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "category", "tiles"),
    path.join(process.cwd(), "apps", "web", "public", "category", "tiles"),
  ]
  return candidates.find((dir) => fs.existsSync(dir)) ?? null
}

/** Public URL for a stored scene, only when that exact slug has its own file. */
export function storedCategoryTileUrl(slug: string): string | null {
  const publicPath = categoryTilePublicPath(slug)
  const dir = tileDirectory()
  if (!publicPath || !dir) return null
  const file = path.join(dir, `${slug.trim().toLowerCase()}.jpg`)
  return fs.existsSync(file) ? publicPath : null
}
