import { getAllCoaches, getAllClubs } from '@/lib/admin/actions';
import { CoachesTable } from '@/components/admin/CoachesTable';
import { UserCog } from 'lucide-react';

export default async function CoachesPage() {
  const [coachesResult, clubsResult] = await Promise.all([getAllCoaches(), getAllClubs()]);

  const coaches = coachesResult.success ? coachesResult.data : [];
  const clubs = clubsResult.success ? clubsResult.data : [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Coaches Management</h1>
        <p className="mt-2 text-gray-600">Manage coaches and their club assignments</p>
      </div>

      {coaches && coaches.length > 0 ? (
        <CoachesTable coaches={coaches} clubs={clubs || []} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12">
          <UserCog className="mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">No coaches yet</h3>
          <p className="text-gray-600">Coaches will appear here after they register</p>
        </div>
      )}
    </div>
  );
}
