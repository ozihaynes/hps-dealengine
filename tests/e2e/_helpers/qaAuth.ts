import type { Page, Response, ConsoleMessage } from "@playwright/test";

type QaCreds = { email: string; password: string };

type QaDealIds = {
  readyDealId: string;
  autosaveDealId?: string;
  timelineDealId?: string;
  staleEvidenceDealId?: string;
  hardGateDealId?: string;
};

export function getQaCredsOrThrow(): QaCreds {
  const email =
    process.env.DEALENGINE_QA_USER_EMAIL ?? process.env.DEALENGINE_TEST_USER_EMAIL;
  const password =
    process.env.DEALENGINE_QA_USER_PASSWORD ?? process.env.DEALENGINE_TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set DEALENGINE_QA_USER_EMAIL and DEALENGINE_QA_USER_PASSWORD to run QA E2E tests.",
    );
  }

  return { email, password };
}

export function getQaDealIdsOrThrow(): QaDealIds {
  const readyDealId = process.env.DEALENGINE_QA_READY_DEAL_ID;
  if (!readyDealId) {
    throw new Error("Set DEALENGINE_QA_READY_DEAL_ID to run QA E2E tests.");
  }

  return {
    readyDealId,
    autosaveDealId: process.env.DEALENGINE_QA_AUTOSAVE_DEAL_ID,
    timelineDealId: process.env.DEALENGINE_QA_TIMELINE_DEAL_ID,
    staleEvidenceDealId: process.env.DEALENGINE_QA_STALE_EVIDENCE_DEAL_ID,
    hardGateDealId: process.env.DEALENGINE_QA_HARD_GATE_DEAL_ID,
  };
}

function isPasswordGrant(resp: Response): boolean {
  return resp.url().includes("/auth/v1/token") && resp.request().method() === "POST";
}

function safeLen(v: unknown): number {
  return typeof v === "string" ? v.length : 0;
}

function trimBody(body: string, max = 1200): string {
  const b = (body ?? "").trim();
  if (b.length <= max) return b;
  return `${b.slice(0, max)}\n…(trimmed)`;
}

type Outcome =
  | { kind: "token"; resp: Response }
  | { kind: "nav" }
  | { kind: "tokenTimeout" }
  | { kind: "navTimeout" };

export async function loginAsQa(page: Page): Promise<void> {
  const { email, password } = getQaCredsOrThrow();

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  };
  const onPageError = (err: Error) => pageErrors.push(err.message);

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  try {
    // IMPORTANT: wait for full load so Next dev hydration/event handlers are attached.
    await page.goto("/login", { waitUntil: "load" });

    const emailInput = page.getByTestId("login-email");
    const passInput = page.getByTestId("login-password");
    const submitBtn = page.getByTestId("login-submit");

    await emailInput.fill(email);
    await passInput.fill(password);

    const typedEmail = await emailInput.inputValue();
    const typedPassLen = safeLen(await passInput.inputValue());

    const tokenP: Promise<Outcome> = page
      .waitForResponse(isPasswordGrant, { timeout: 15_000 })
      .then((resp) => ({ kind: "token", resp }))
      .catch(() => ({ kind: "tokenTimeout" }));

    const navP: Promise<Outcome> = page
      .waitForURL((url) => !/\/login\/?$/i.test(url.pathname), { timeout: 15_000 })
      .then(() => ({ kind: "nav" }))
      .catch(() => ({ kind: "navTimeout" }));

    await submitBtn.click();

    const first = await Promise.race([tokenP, navP]);

    // If we navigated away from /login quickly, treat as success (server-action style auth).
    if (first.kind === "nav") return;

    // Otherwise, wait for both outcomes to decide what happened.
    const [tokenRes, navRes] = await Promise.all([tokenP, navP]);

    if (tokenRes.kind === "token") {
      const tokenUrl = tokenRes.resp.url();
      const status = tokenRes.resp.status();
      const body = trimBody(await tokenRes.resp.text().catch(() => ""));

      let postedEmail: string | undefined;
      let postedPassLen = 0;
      try {
        const json = tokenRes.resp.request().postDataJSON() as
          | { email?: string; password?: string }
          | null;
        postedEmail = json?.email;
        postedPassLen = safeLen(json?.password);
      } catch {
        // ignore
      }

      if (!tokenRes.resp.ok()) {
        throw new Error(
          [
            `Login failed: Supabase token endpoint returned ${status}.`,
            `Token URL: ${tokenUrl}`,
            body ? `Body:\n${body}` : "",
            `Typed email: ${typedEmail}`,
            `Typed password length: ${typedPassLen}`,
            `Posted email: ${postedEmail ?? "(unavailable)"}`,
            `Posted password length: ${postedPassLen}`,
            consoleErrors.length ? `Console errors:\n- ${consoleErrors.join("\n- ")}` : "",
            pageErrors.length ? `Page errors:\n- ${pageErrors.join("\n- ")}` : "",
            `Current page URL: ${page.url()}`,
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }

      // Token succeeded; ensure we leave /login.
      const left = await page
        .waitForURL((url) => !/\/login\/?$/i.test(url.pathname), { timeout: 20_000 })
        .then(() => true)
        .catch(() => false);

      if (!left) {
        throw new Error(
          [
            "Login token succeeded, but app did not navigate away from /login.",
            `Token URL: ${tokenUrl}`,
            `Typed email: ${typedEmail}`,
            `Typed password length: ${typedPassLen}`,
            consoleErrors.length ? `Console errors:\n- ${consoleErrors.join("\n- ")}` : "",
            pageErrors.length ? `Page errors:\n- ${pageErrors.join("\n- ")}` : "",
            `Current page URL: ${page.url()}`,
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }

      return;
    }

    // No token request AND no navigation = most likely "not hydrated yet" / handler not running.
    throw new Error(
      [
        "Login failed: no Supabase token request observed AND app did not navigate away from /login.",
        `Typed email: ${typedEmail}`,
        `Typed password length: ${typedPassLen}`,
        `Current page URL: ${page.url()}`,
        consoleErrors.length ? `Console errors:\n- ${consoleErrors.join("\n- ")}` : "",
        pageErrors.length ? `Page errors:\n- ${pageErrors.join("\n- ")}` : "",
        "Hint: this usually means the page wasn't hydrated yet (React submit handler not attached), so the click caused a plain GET /login? reload.",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}
