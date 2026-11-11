import { Suspense } from 'react';
import { CoachHomeTrainingList } from '@/components/coach/CoachHomeTrainingList';

export default function CoachHomeTrainingPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review home training</h1>
        <p className="text-muted-foreground">Review and give feedback on athletes' home training</p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <CoachHomeTrainingList />
      </Suspense>
    </div>
  );
}
