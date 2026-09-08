"use client"

import { cmsThemeToCss, type CmsThemeDocument } from "@europmade/utils"

export function CmsThemeStyle({ theme }: { theme: CmsThemeDocument | null }) {
  if (!theme) return null
  return (
    <style
      id="em-cms-theme"
      dangerouslySetInnerHTML={{ __html: cmsThemeToCss(theme) }}
    />
  )
}
