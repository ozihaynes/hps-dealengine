"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      try {
        // Tell Supabase to forget the session
        await supabase.auth.signOut();
      } catch (err) {
        console.error("supabase.auth.signOut error", err);
      } finally {
        // Clear our auth cookie so middleware sees "logged out"
        document.cookie = [
          "hps_auth_token=",
          "path=/",
          "max-age=0",
          "samesite=lax",
        ].join("; ");

        router.replace("/login");
      }
    }

    run();
  }, [router]);

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <p className="text-sm text-gray-500">Signing you out…</p>
    </div>
  );
}
