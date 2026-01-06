import React from "react";
import { GlassCard, Button, InputField, Icon } from "../ui";
import { Icons } from "../../constants";

interface SignInPageProps {
  email: string;
  password: string;
  loading: boolean;
  error?: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

const SignInPage: React.FC<SignInPageProps> = ({
  email,
  password,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}) => {
  return (
    <div className="w-full max-w-md animate-fade-in">
      <GlassCard className="p-8 border-t border-accent-blue/30 shadow-[0_0_40px_-10px_rgba(0,150,255,0.15)]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-brand-navy border border-accent-blue/30 mb-4 shadow-lg shadow-accent-blue/10">
            <Icon
              d={Icons.calculator}
              size={32}
              className="text-accent-blue"
            />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            DealEngine&trade;
          </h1>
          <p className="text-text-secondary mt-2 text-sm">
            Secure Underwriting Terminal
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-4">
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@example.com"
              prefix="@"
            />
            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder=""
              suffix={loading ? "..." : ""}
            />
          </div>

          {error && (
            <div className="p-3 rounded bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs font-semibold text-center animate-pulse">
              {error}
            </div>
          )}

          <Button
            variant="primary"
            className="w-full h-12 text-base shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 transition-all duration-300"
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Initialize Session"}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-text-secondary/50 uppercase tracking-widest">
            Restricted Access  HPS Inv.
          </p>
        </div>
      </GlassCard>
    </div>
  );
};

export default SignInPage;
