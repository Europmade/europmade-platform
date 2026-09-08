"use client"

import { useParams } from "next/navigation"
import { CmsProductStudio } from "../../../../../components/cms/cms-product-studio"

export default function CmsProductEditPage() {
  const params = useParams()
  const id = decodeURIComponent(String(params.id ?? ""))
  return <CmsProductStudio productId={id} />
}
