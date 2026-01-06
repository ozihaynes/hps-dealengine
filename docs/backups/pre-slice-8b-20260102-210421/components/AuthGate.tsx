"use client";

import React, { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

type AuthGateProps = {
  children: ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;

    const computeRedirectTo = (): string => {
      // Prefer full current URL in the browser, fall back to pathname on server
      if (typeof window !== "undefined" && window.location?.href) {
        return window.location.href;
      }
      return pathname || "/";
    };

    const redirectToLogin = () => {
      const redirectTo = computeRedirectTo();
      router.replace("/login?redirectTo=" + encodeURIComponent(redirectTo));
    };

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      const current = data.session ?? null;
      setSession(current);
      setReady(true);

      if (!current) {
        redirectToLogin();
      }
    };

    void checkSession();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        if (!active) return;
        setSession(nextSession);
        if (!nextSession) {
          redirectToLogin();
        }
      }
    );

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, [router, pathname]);

  if (!ready) {
    // Optional: loading skeleton later
    return null;
  }

  if (!session) {
    // Redirect is in flight; render nothing
    return null;
  }

  return <>{children}</>;
}
