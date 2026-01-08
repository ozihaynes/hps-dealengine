"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptInvite, InviteError } from "@/lib/teamInvites";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getInviteRoleDisplay } from "@hps-internal/contracts";

type PageState =
  | { status: "loading" }
  | { status: "needs_login"; token: string }
  | { status: "accepting" }
  | {
      status: "success";
      orgName: string | null;
      role: string;
      alreadyMember: boolean;
    }
  | { status: "error"; error: string; expectedEmail?: string };

type PageProps = {
  params: { token: string };
};

export default function InviteAcceptPage({ params }: PageProps) {
  const router = useRouter();
  const token = params.token;

  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    if (!token) return;

    const checkAuthAndAccept = async () => {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // EC-2.12: If not logged in, redirect to login with token preservation
      if (!session) {
        setState({ status: "needs_login", token });
        return;
      }

      // Try to accept the invitation
      setState({ status: "accepting" });

      try {
        const result = await acceptInvite({ token });

        setState({
          status: "success",
          orgName: result.org_name ?? null,
          role: result.role,
          alreadyMember: result.already_member,
        });

        // Redirect to overview after 3 seconds
        setTimeout(() => {
          router.push("/overview");
        }, 3000);
      } catch (err) {
        if (err instanceof InviteError) {
          setState({
            status: "error",
            error: err.message,
            expectedEmail: err.expectedEmail,
          });
        } else {
          setState({
            status: "error",
            error: "An unexpected error occurred. Please try again.",
          });
        }
      }
    };

    checkAuthAndAccept();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-surface-elevated/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/30">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary">
              HPS DealEngine
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Team Invitation
            </p>
          </div>

          {/* Loading State */}
          {state.status === "loading" && (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-accent-blue border-r-transparent" />
              <p className="text-text-secondary mt-4">
                Verifying invitation...
              </p>
            </div>
          )}

          {/* Needs Login State */}
          {state.status === "needs_login" && (
            <div className="text-center space-y-6">
              <div className="p-4 bg-accent-blue/10 border border-accent-blue/20 rounded-lg">
                <p className="text-text-primary">
                  Please sign in to accept this invitation
                </p>
              </div>
              <Link
                href={`/login?returnTo=${encodeURIComponent(`/invite/${state.token}`)}`}
                className="inline-flex items-center justify-center w-full min-h-[44px] rounded-lg bg-accent-blue text-white font-semibold hover:bg-accent-blue/90 transition-colors"
              >
                Sign in to Continue
              </Link>
              <p className="text-xs text-text-secondary">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/signup?returnTo=${encodeURIComponent(`/invite/${state.token}`)}`}
                  className="text-accent-blue hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          )}

          {/* Accepting State */}
          {state.status === "accepting" && (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-accent-green border-r-transparent" />
              <p className="text-text-secondary mt-4">
                Accepting invitation...
              </p>
            </div>
          )}

          {/* Success State */}
          {state.status === "success" && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-green/20">
                <svg
                  className="w-8 h-8 text-accent-green"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-text-primary">
                  {state.alreadyMember
                    ? "You're already a member!"
                    : "Welcome to the team!"}
                </h2>
                <p className="text-text-secondary mt-2">
                  {state.orgName ? (
                    <>
                      You&apos;re now part of{" "}
                      <span className="font-semibold text-text-primary">
                        {state.orgName}
                      </span>{" "}
                      as{" "}
                      <span className="text-accent-green font-semibold">
                        {getInviteRoleDisplay(state.role as "analyst" | "manager" | "vp")}
                      </span>
                    </>
                  ) : (
                    <>
                      You&apos;ve joined as{" "}
                      <span className="text-accent-green font-semibold">
                        {getInviteRoleDisplay(state.role as "analyst" | "manager" | "vp")}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="pt-4">
                <p className="text-xs text-text-secondary mb-4">
                  Redirecting to dashboard in a moment...
                </p>
                <Link
                  href="/overview"
                  className="inline-flex items-center justify-center w-full min-h-[44px] rounded-lg bg-accent-green text-white font-semibold hover:bg-accent-green/90 transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* Error State */}
          {state.status === "error" && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-red/20">
                <svg
                  className="w-8 h-8 text-accent-red"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-text-primary">
                  Unable to Accept Invitation
                </h2>
                <p className="text-text-secondary mt-2">{state.error}</p>
                {state.expectedEmail && (
                  <p className="text-sm text-accent-blue mt-4">
                    Please sign in with{" "}
                    <span className="font-semibold">{state.expectedEmail}</span>
                  </p>
                )}
              </div>

              <div className="pt-4 space-y-3">
                {state.expectedEmail ? (
                  <Link
                    href={`/login?returnTo=${encodeURIComponent(`/invite/${token}`)}`}
                    className="inline-flex items-center justify-center w-full min-h-[44px] rounded-lg bg-accent-blue text-white font-semibold hover:bg-accent-blue/90 transition-colors"
                  >
                    Sign in with Different Account
                  </Link>
                ) : (
                  <Link
                    href="/overview"
                    className="inline-flex items-center justify-center w-full min-h-[44px] rounded-lg bg-white/10 text-text-primary font-semibold hover:bg-white/20 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-secondary mt-6">
          &copy; {new Date().getFullYear()} HPS DealEngine
        </p>
      </div>
    </div>
  );
}
