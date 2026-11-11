import { createClient } from '@/lib/db/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Phone, Calendar, Heart, Building2, Edit3, ChevronRight, Activity, TrendingUp, FileText } from 'lucide-react';

interface AthleteProfile {
  id: string;
  user_id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  date_of_birth: string;
  phone_number: string;
  email: string;
  gender: string;
  health_notes?: string;
  profile_picture_url?: string;
  clubs?: {
    id: string;
    name: string;
    description?: string;
  };
}

export default async function AthleteProfilePage() {
  const db = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get athlete profile
  const { data: profile, error: profileError } = await db
    .from('athletes')
    .select(
      `
      *,
      clubs (
        id,
        name,
        description
      )
    `
    )
    .eq('user_id', user.id)
    .single() as { data: AthleteProfile | null; error: any };

  if (profileError || !profile) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900">Personal information</h1>
        <p className="mt-4 text-red-600">Profile not found</p>
      </div>
    );
  }

  const athleteId = profile.id;

  // Get training history count
  const { count: trainingCount } = await db
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', athleteId)
    .eq('status', 'present');

  // Get performance records count
  const { count: performanceCount } = await db
    .from('performance_records')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', athleteId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Your personal information</p>
        </div>
        <Link
          href="/dashboard/athlete/profile/edit"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </Link>
      </div>

      {/* Profile Card - Minimal Black & White */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-6 mb-6 pb-6 border-b border-gray-100">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center overflow-hidden">
              {profile.profile_picture_url ? (
                <img
                  src={profile.profile_picture_url}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-white" />
              )}
            </div>
          </div>

          {/* Name & Role */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-black mb-1">
              {profile.first_name} {profile.last_name}
            </h2>
            {profile.nickname && (
              <p className="text-base text-gray-600 mb-2">"{profile.nickname}"</p>
            )}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
              <div className="w-2 h-2 rounded-full bg-black"></div>
              <span className="text-xs font-medium text-black">Athletes</span>
            </div>
          </div>
        </div>

        {/* Stats - Minimal */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-black">{trainingCount || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Sessions</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-3xl font-bold text-black">{performanceCount || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Test results</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-black">
              {trainingCount && trainingCount > 0 ? Math.round((trainingCount / (trainingCount + 5)) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Present</p>
          </div>
        </div>

        {/* Info Grid - Clean Layout */}
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <p className="text-sm font-medium text-black truncate">{profile.email}</p>
            </div>
          </div>

          {profile.phone_number && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">Phone number</p>
                <p className="text-sm font-medium text-black">{profile.phone_number}</p>
              </div>
            </div>
          )}

          {profile.date_of_birth && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">Date of birth</p>
                <p className="text-sm font-medium text-black">
                  {new Date(profile.date_of_birth).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}

          {profile.clubs && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">Club</p>
                <p className="text-sm font-medium text-black">{profile.clubs.name}</p>
                {profile.clubs.description && (
                  <p className="text-xs text-gray-500 mt-1">{profile.clubs.description}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Health Notes - Minimal Warning Style */}
      {profile.health_notes && (
        <div className="bg-white border-2 border-black rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-black mb-2">Health notes</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{profile.health_notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links - Minimal List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-black">Quick menu</h3>
        </div>
        <div className="divide-y divide-gray-100">
          <Link
            href="/dashboard/athlete/attendance"
            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-black transition-colors">
              <Activity className="w-5 h-5 text-black group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-black">Attendance history</p>
              <p className="text-xs text-gray-500">View all training history</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
          </Link>

          <Link
            href="/dashboard/athlete/performance"
            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-black transition-colors">
              <TrendingUp className="w-5 h-5 text-black group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-black">Test results</p>
              <p className="text-xs text-gray-500">View performance and progress</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
          </Link>

          <Link
            href="/dashboard/athlete/applications"
            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-black transition-colors">
              <FileText className="w-5 h-5 text-black group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-black">My applications</p>
              <p className="text-xs text-gray-500">View club membership application status</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
