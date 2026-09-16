import { CmsActionStudio } from "../../../../../components/cms/cms-action-studio"

export default async function CmsActionEditRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CmsActionStudio pageId={id} />
}
