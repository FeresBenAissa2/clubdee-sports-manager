'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/db/client';
import type { User } from '@/lib/db/types';

export interface AuthUser extends User {
  role?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
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
  }, [db]);

  const signOut = async () => {
    await db.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
