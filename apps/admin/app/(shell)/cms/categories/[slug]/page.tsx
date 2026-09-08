"use client"

import { useParams } from "next/navigation"
import { CmsCategoryStudio } from "../../../../../components/cms/cms-category-studio"

export default function CmsCategoryEditPage() {
  const params = useParams()
  const slug = decodeURIComponent(String(params.slug ?? ""))
  return <CmsCategoryStudio slug={slug} />
}
