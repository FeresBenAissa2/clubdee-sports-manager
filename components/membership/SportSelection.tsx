'use client';

import { useEffect, useState } from 'react';
import { getAvailableClubs } from '@/lib/membership/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users } from 'lucide-react';

interface Club {
  id: string;
  name: string;
  description: string | null;
  sport_type: string;
  member_count: number;
  coach_count: number;
}

interface SportSelectionProps {
  onSelect: (clubId: string) => void;
  selectedClubId?: string;
}

export function SportSelection({ onSelect, selectedClubId }: SportSelectionProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadClubs();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClubs(clubs);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredClubs(
      clubs.filter(
        (club) =>
          club.name.toLowerCase().includes(query) ||
          (club.sport_type || '').toLowerCase().includes(query) ||
          club.description?.toLowerCase().includes(query)
      )
    );
  }, [searchQuery, clubs]);

  async function loadClubs() {
    setLoading(true);
    setError(null);
    const result = await getAvailableClubs();
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setClubs(result.data || []);
    setFilteredClubs(result.data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadClubs}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <Users className="w-8 h-8 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No sports open right now</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          No sport is open for registration right now. Each sport (club in the
          admin panel) needs at least one coach. If clubs exist in the admin panel but not
          here, assign a coach to the club.
        </p>
        <button
          onClick={loadClubs}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search sports..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredClubs.length === 0 && searchQuery ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches</h3>
          <p className="text-gray-600">Try a different search term.</p>
        </div>
      ) : null}

      {filteredClubs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClubs.map((club) => (
            <Card
              key={club.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedClubId === club.id
                  ? 'ring-2 ring-blue-600 border-blue-600'
                  : 'hover:border-gray-400'
              }`}
              onClick={() => onSelect(club.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="font-athletic text-2xl font-extrabold uppercase italic">
                    {club.sport_type || club.name}
                  </span>
                  {selectedClubId === club.id ? (
                    <span className="text-blue-600 text-sm font-normal">✓ Selected</span>
                  ) : null}
                </CardTitle>
                {club.sport_type ? (
                  <CardDescription className="text-sm font-medium text-blue-600">
                    {club.name}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {club.description ? (
                  <p className="text-sm text-gray-600 line-clamp-2">{club.description}</p>
                ) : null}
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Users className="w-4 h-4 text-gray-400" />
                  Members: {club.member_count} · Coaches: {club.coach_count}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
