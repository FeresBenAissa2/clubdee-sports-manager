import { Users } from 'lucide-react';
import { AthletesTable } from '@/components/admin/AthletesTable';
import { getAllAthletes } from '@/lib/admin/actions';

export default async function AthletesPage() {
  const result = await getAllAthletes();
  const athletes = result.success ? result.data ?? [] : [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Athletes Management</h1>
        <p className="mt-2 text-gray-600">
          All registered athletes and their clubs ({athletes.length})
        </p>
      </div>

      {athletes.length > 0 ? (
        <AthletesTable athletes={athletes} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12">
          <Users className="mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">No athletes yet</h3>
          <p className="text-gray-600">
            Athletes appear here once a coach approves their membership application
          </p>
        </div>
      )}
    </div>
  );
}
