import { getAllClubs } from '@/lib/admin/actions';
import { ClubsTable } from '@/components/admin/ClubsTable';
import { CreateClubButton } from '@/components/admin/CreateClubButton';
import { Building2 } from 'lucide-react';

export default async function ClubsPage() {
  const result = await getAllClubs();
  const clubs = result.success ? result.data : [];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clubs Management</h1>
          <p className="mt-2 text-gray-600">Manage all sports clubs in the system</p>
        </div>
        <CreateClubButton />
      </div>

      {clubs && clubs.length > 0 ? (
        <ClubsTable clubs={clubs} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12">
          <Building2 className="mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">No clubs yet</h3>
          <p className="mb-4 text-gray-600">Get started by creating your first club</p>
          <CreateClubButton />
        </div>
      )}
    </div>
  );
}
