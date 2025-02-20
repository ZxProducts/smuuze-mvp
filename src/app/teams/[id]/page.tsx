import { Suspense } from 'react';
import TeamDetailsContent from './TeamDetailsContent';

export default function TeamDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <TeamDetailsContent teamId={params.id} />
    </Suspense>
  );
}