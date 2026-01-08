"use client";

import React from "react";
import LoginForm from "./LoginForm";
import { AppBackground } from "@/components/layout";

type LoginClientProps = {
  redirectTo?: string;
};

export default function LoginClient({ redirectTo }: LoginClientProps) {
  // If no redirectTo is provided, ALWAYS go to /startup
  const targetPath = redirectTo || "/startup";

  return (
    <AppBackground>
      <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:py-16">
        <LoginForm redirectTo={targetPath} />
      </div>
    </AppBackground>
  );
}
