import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import { Bell, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AnnouncementCard } from '@/components/athlete/AnnouncementCard';

interface AthleteProfile {
  id: string;
  club_id: string | null;
  first_name: string;
  last_name: string;
}

export default async function AthleteAnnouncementsPage() {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get athlete profile
  const { data: athlete } = (await db
    .from('athletes')
    .select('id, club_id, first_name, last_name')
    .eq('user_id', user.id)
    .single()) as { data: AthleteProfile | null };

  if (!athlete) {
    redirect('/dashboard/athlete');
  }

  // First, get all coaches from the athlete's club
  const { data: clubCoaches } = await db
    .from('coaches')
    .select('id')
    .eq('club_id', athlete.club_id || '') as { data: { id: string }[] | null };

  const coachIds = clubCoaches?.map(c => c.id) || [];

  // Get announcements from club coaches with read status
  const { data: announcements, error } = await db
    .from('announcements')
    .select(`
      *,
      announcement_reads(user_id)
    `)
    .in('coach_id', coachIds.length > 0 ? coachIds : ['00000000-0000-0000-0000-000000000000'])
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  // Debug: log error if any
  if (error) {
    console.error('Error fetching announcements:', error);
  }

  // Transform announcements to include read status
  const announcementsWithReadStatus = announcements?.map((announcement: any) => ({
    ...announcement,
    is_read: announcement.announcement_reads?.some(
      (read: any) => read.user_id === user.id
    ),
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Native App Style */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/athlete"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-black" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-black">Announcements from coach</h1>
              <p className="text-xs text-gray-500">
                News and important announcements
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {announcementsWithReadStatus.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-black mb-2">No announcements yet</h3>
            <p className="text-sm text-gray-500">
              No announcements from your coach at this time
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcementsWithReadStatus.map((announcement: any) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom spacing */}
      <div className="h-24"></div>
    </div>
  );
}
