'use client';
import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);

  React.useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e: AuthChangeEvent, s: Session | null) => setSession(s)
    );
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  if (!session) return null;
  return <>{children}</>;
}
