import { ReviewWorkspace } from '@/components/review-workspace'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  return <ReviewWorkspace draftId={draftId} />
}
