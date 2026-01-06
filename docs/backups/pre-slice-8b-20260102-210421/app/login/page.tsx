import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Log in – HPS DealEngine",
  description:
    "Authenticate to HPS DealEngine to run deterministic, RLS-backed underwriting.",
};

type LoginPageProps = {
  searchParams?: {
    redirectTo?: string | string[];
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const raw = searchParams?.redirectTo;
  const redirectTo =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw) && raw.length > 0
      ? raw[0]
      : "/startup";

  return <LoginClient redirectTo={redirectTo} />;
}
