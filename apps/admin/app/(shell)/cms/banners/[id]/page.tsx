"use client"

import { use } from "react"
import CmsBannerEditor from "../../../../../components/cms-banner-editor"

export default function EditCmsBannerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <CmsBannerEditor bannerId={id} />
}
