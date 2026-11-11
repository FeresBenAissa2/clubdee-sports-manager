import { Suspense } from 'react';
import { HomeTrainingList } from '@/components/athlete/HomeTrainingList';
import { CreateHomeTrainingDialog } from '@/components/athlete/CreateHomeTrainingDialog';
import { HomeTrainingStats } from '@/components/athlete/HomeTrainingStats';

export default function HomeTrainingPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Home training</h1>
          <p className="text-muted-foreground">Record and track supplemental home training</p>
        </div>
        <CreateHomeTrainingDialog />
      </div>

      <Suspense fallback={<div>Loading statistics...</div>}>
        <HomeTrainingStats />
      </Suspense>

      <Suspense fallback={<div>Loading training history...</div>}>
        <HomeTrainingList />
      </Suspense>
    </div>
  );
}
