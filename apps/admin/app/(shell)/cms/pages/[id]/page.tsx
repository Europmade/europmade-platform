import { CmsPageStudio } from "../../../../../components/cms/cms-page-studio"

export default async function CmsPageEditRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CmsPageStudio pageId={id} />
}
