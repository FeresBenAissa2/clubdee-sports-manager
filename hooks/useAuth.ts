'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/db/client';
import type { User } from '@/lib/db/types';
import { useRouter } from 'next/navigation';

export interface AuthUser extends User {
  role?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const db = createClient();

  useEffect(() => {
    // Get initial session
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await db.auth.getUser();

        if (user) {
          // Get user role
          const { data: roleData } = await db
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

          type UserRole = 'admin' | 'coach' | 'athlete';
          const role: UserRole = (roleData as { role: UserRole } | null)?.role || 'athlete';

          setUser({
            ...user,
            role,
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Get user role
        const { data: roleData } = await db
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        type UserRole = 'admin' | 'coach' | 'athlete';
        const role: UserRole = (roleData as { role: UserRole } | null)?.role || 'athlete';

        setUser({
          ...session.user,
          role,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [db, router]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isCoach: user?.role === 'coach',
    isAthlete: user?.role === 'athlete',
  };
}
