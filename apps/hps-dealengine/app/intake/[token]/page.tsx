"use client";

import React, { useEffect, useState, useCallback } from "react";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { validateIntakeToken, type IntakeSchemaApi } from "@/lib/intakePublic";

type TokenState =
  | { status: "loading" }
  | { status: "valid"; data: ValidTokenData }
  | { status: "invalid"; error: string; code: string };

type ValidTokenData = {
  linkId: string;
  schema: IntakeSchemaApi;
  existingPayload: Record<string, unknown> | null;
  recipientName: string | null;
  expiresAt: string;
  dealContext: {
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default function IntakeFormPage({ params }: PageProps) {
  const [tokenState, setTokenState] = useState<TokenState>({ status: "loading" });
  const [submitted, setSubmitted] = useState(false);
  const [tokenValue, setTokenValue] = useState<string | null>(null);

  // Unwrap params (Next.js 15 async params)
  useEffect(() => {
    params.then((p) => setTokenValue(p.token));
  }, [params]);

  // Validate token on mount
  useEffect(() => {
    if (!tokenValue) return;

    const validate = async () => {
      try {
        const result = await validateIntakeToken(tokenValue);

        if (!result.valid) {
          setTokenState({
            status: "invalid",
            error: getErrorMessage(result.error ?? "UNKNOWN"),
            code: result.error ?? "UNKNOWN",
          });
          return;
        }

        setTokenState({
          status: "valid",
          data: {
            linkId: result.link_id!,
            schema: result.schema!,
            existingPayload: result.existing_payload ?? null,
            recipientName: result.recipient_name ?? null,
            expiresAt: result.expires_at!,
            dealContext: result.deal_context ?? null,
          },
        });
      } catch (err) {
        console.error("Token validation error:", err);
        setTokenState({
          status: "invalid",
          error: "An unexpected error occurred. Please try again later.",
          code: "NETWORK_ERROR",
        });
      }
    };

    validate();
  }, [tokenValue]);

  const handleSubmitSuccess = useCallback(() => {
    setSubmitted(true);
  }, []);

  // Loading state
  if (tokenState.status === "loading" || !tokenValue) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--accent-blue)] border-t-transparent" />
        <p className="text-sm text-[color:var(--text-secondary)]">
          Loading your form...
        </p>
      </div>
    );
  }

  // Invalid token state
  if (tokenState.status === "invalid") {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/20">
            <svg
              className="h-5 w-5 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-amber-200">
              {getErrorTitle(tokenState.code)}
            </h2>
            <p className="mt-1 text-sm text-amber-200/80">
              {tokenState.error}
            </p>
            <p className="mt-4 text-xs text-[color:var(--text-secondary)]">
              If you believe this is an error, please contact the person who sent you this link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Submitted success state
  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/20">
            <svg
              className="h-8 w-8 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-emerald-200">
            Thank You!
          </h2>
          <p className="mt-2 text-sm text-emerald-200/80">
            Your information has been submitted successfully.
          </p>
          <p className="mt-4 text-xs text-[color:var(--text-secondary)]">
            We&apos;ll be in touch soon. You can close this page.
          </p>
        </div>
      </div>
    );
  }

  // Valid token - show form
  const { data } = tokenState;
  const daysUntilExpiry = Math.ceil(
    (new Date(data.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div className="rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-4">
        <p className="text-sm text-[color:var(--text-primary)]">
          {data.recipientName ? (
            <>
              Hi <span className="font-semibold">{data.recipientName}</span>,
            </>
          ) : (
            "Hi,"
          )}{" "}
          please complete the following information about your property.
        </p>
        {data.dealContext?.address && (
          <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
            Property: {data.dealContext.address}
            {data.dealContext.city && `, ${data.dealContext.city}`}
            {data.dealContext.state && `, ${data.dealContext.state}`}
            {data.dealContext.zip && ` ${data.dealContext.zip}`}
          </p>
        )}
      </div>

      {/* Expiration warning */}
      {daysUntilExpiry <= 3 && daysUntilExpiry > 0 && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2">
          <p className="text-xs text-amber-200">
            This link expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""}.
            Please complete the form soon.
          </p>
        </div>
      )}

      {/* Form */}
      <IntakeForm
        token={tokenValue}
        linkId={data.linkId}
        schema={data.schema}
        initialPayload={data.existingPayload}
        onSubmitSuccess={handleSubmitSuccess}
      />
    </div>
  );
}

function getErrorTitle(code: string): string {
  switch (code) {
    case "TOKEN_EXPIRED":
      return "Link Expired";
    case "TOKEN_CONSUMED":
      return "Already Submitted";
    case "TOKEN_REVOKED":
    case "LINK_REVOKED":
      return "Link Revoked";
    case "TOKEN_INVALID":
      return "Invalid Link";
    default:
      return "Unable to Load Form";
  }
}

function getErrorMessage(code: string): string {
  switch (code) {
    case "TOKEN_EXPIRED":
      return "This intake form link has expired. Please request a new link from the sender.";
    case "TOKEN_CONSUMED":
      return "This form has already been submitted. If you need to make changes, please contact the sender.";
    case "TOKEN_REVOKED":
    case "LINK_REVOKED":
      return "This link has been revoked and is no longer valid.";
    case "TOKEN_INVALID":
      return "This link is not valid. Please check the URL or request a new link.";
    case "NETWORK_ERROR":
      return "Unable to connect to the server. Please check your internet connection and try again.";
    default:
      return "Something went wrong. Please try again later or contact support.";
  }
}
