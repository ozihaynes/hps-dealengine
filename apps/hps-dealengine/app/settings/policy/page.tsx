"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import BusinessLogicSandbox from "@/components/settings/BusinessLogicSandbox";
import sandboxDefaults from "@/constants/sandboxDefaults";

export default function PolicySettingsPage() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;

  const props: any = {
    isOpen: true,
    onClose: () => {},
    onSave: () => {},
    initialSettings: sandboxDefaults,
    currentTokens: {},
    onTokensChange: () => {},
  };

  return (
    <div className="p-6">
      <BusinessLogicSandbox {...props} />
    </div>
  );
}
