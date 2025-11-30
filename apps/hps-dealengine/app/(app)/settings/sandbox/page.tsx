"use client";

// Redirect the legacy settings route to the canonical /sandbox page.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SandboxSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sandbox");
  }, [router]);

  return null;
}
