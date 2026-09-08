import { CategoryPreviewClient } from "../../../_components/category/category-preview-client"

export default async function CategoryPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <CategoryPreviewClient slug={slug} />
}
