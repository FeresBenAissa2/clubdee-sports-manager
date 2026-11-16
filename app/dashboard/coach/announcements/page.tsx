import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { Bell, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CreateAnnouncementDialog } from '@/components/coach/CreateAnnouncementDialog';
import { AnnouncementList } from '@/components/coach/AnnouncementList';
interface CoachProfile {
  id: string;
  club_id: string | null;
  first_name: string;
  last_name: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export default async function CoachAnnouncementsPage() {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get coach profile
  const { data: coach } = (await db
    .from('coaches')
    .select('id, club_id, first_name, last_name')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()) as { data: CoachProfile | null };

  if (!coach) {
    redirect('/dashboard/coach');
  }

  // A coach has one row per club; announcements belong to one of those rows.
  const { data: coachRows } = (await db
    .from('coaches')
    .select('id, club_id, clubs (id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })) as {
    data: { id: string; club_id: string; clubs?: { id: string; name: string } | null }[] | null;
  };
  const myCoachRows = coachRows ?? [];
  const clubs = myCoachRows.map((row) => ({ id: row.club_id, name: row.clubs?.name ?? 'Club' }));
  const clubOfCoachRow = new Map(myCoachRows.map((row) => [row.id, row.club_id]));
  const clubName = new Map(clubs.map((club) => [club.id, club.name]));

  // Athletes per club, to show "read by X of Y" against the right club
  const athletesPerClub = new Map<string, number>();
  await Promise.all(
    clubs.map(async (club) => {
      const { count } = await db
        .from('athletes')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', club.id);
      athletesPerClub.set(club.id, count || 0);
    })
  );

  // Get announcements
  const { data: announcements } = await db
    .from('announcements')
    .select('*')
    .in('coach_id', myCoachRows.map((row) => row.id))
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  // Get read counts for each announcement
  const announcementsWithReads = await Promise.all(
    (announcements || []).map(async (announcement: Announcement) => {
      const { count } = await db
        .from('announcement_reads')
        .select('*', { count: 'exact', head: true })
        .eq('announcement_id', announcement.id);

      const clubId = clubOfCoachRow.get((announcement as Announcement & { coach_id?: string }).coach_id ?? '') ?? '';
      return {
        ...announcement,
        read_count: count || 0,
        total_athletes: athletesPerClub.get(clubId) ?? 0,
        club_name: clubs.length > 1 ? clubName.get(clubId) : undefined,
      };
    })
  );

  // Get total athletes count in the club
  const { count: totalAthletes } = await db
    .from('athletes')
    .select('*', { count: 'exact', head: true })
    .in('club_id', clubs.map((club) => club.id));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Native App Style */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/coach"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-black" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-black">Announcements</h1>
                <p className="text-xs text-gray-500">
                  Manage announcements for athletes
                </p>
              </div>
            </div>
            <CreateAnnouncementDialog clubs={clubs} />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {announcementsWithReads && announcementsWithReads.length > 0 && (
        <div className="px-4 pt-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">All</p>
              <p className="text-2xl font-bold text-black">{announcementsWithReads.length}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Pinned</p>
              <p className="text-2xl font-bold text-black">
                {announcementsWithReads.filter((a: any) => a.is_pinned).length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Athletes</p>
              <p className="text-2xl font-bold text-black">{totalAthletes || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-6">
        <AnnouncementList
          announcements={announcementsWithReads || []}
          totalAthletes={totalAthletes || 0}
        />
      </div>
    </div>
  );
}
