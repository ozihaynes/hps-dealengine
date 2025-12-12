/**
 * Dev auth reset + reseed for hps-dealengine.
 *
 * Schema snapshot (dev):
 * - public.organizations: id uuid PK (default gen_random_uuid()), name text not null, created_at timestamptz default now().
 * - public.memberships: org_id uuid not null, user_id uuid not null, role public.membership_role NOT NULL DEFAULT 'analyst',
 *   created_at timestamptz default now(); PK(org_id, user_id); FK org_id -> public.organizations(id) ON DELETE CASCADE;
 *   role enum values: analyst | manager | vp | owner; RLS enabled with self-scoped policies.
 * - auth.users: Supabase Auth store (managed via service_role).
 */

import fs from "fs/promises";
import path from "path";
import process from "process";

import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

type MembershipRole = "analyst" | "manager" | "vp" | "owner";

type MembershipRow = {
  org_id: string;
  user_id: string;
  role: MembershipRole;
  created_at?: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  created_at?: string;
};

type RoleKey =
  | "owner"
  | "manager"
  | "policy"
  | "qa_policy"
  | "underwriter"
  | "viewer";

type SeedRole = {
  key: RoleKey;
  friendlyName: string;
  email: string;
  membershipRole: MembershipRole;
  can: string;
  cannot: string;
};

const DEV_PROJECT_REF = "zjkihnihhqmnhpxkecpy";
const DEV_ORG_ID = "033ff93d-ff97-4af9-b3a1-a114d3c04da6";
const DEV_ORG_NAME = "HPS DealEngine Dev Org";
const DEV_PASSWORD = "HpsDev!2025";
const BACKUP_DIR = path.join(process.cwd(), "supabase", "backups");

const ROLE_MATRIX: SeedRole[] = [
  {
    key: "owner",
    friendlyName: "Org Owner",
    email: "owner@hps.test.local",
    membershipRole: "owner",
    can: "Everything in the org: manage org, members, deals, policies, sandbox, overrides, billing, etc.",
    cannot: "Nothing – full control in dev.",
  },
  {
    key: "manager",
    friendlyName: "Ops / Team Manager",
    email: "manager@hps.test.local",
    membershipRole: "manager",
    can: "Manage deals & runs, approve overrides, manage underwriters, adjust sandbox knobs.",
    cannot: "Cannot delete org or change billing owner; cannot access other orgs.",
  },
  {
    key: "policy",
    friendlyName: "Policy Author",
    email: "policy@hps.test.local",
    membershipRole: "vp",
    can: "Create/edit risk policies, thresholds, checklists; approve/reject overrides.",
    cannot: "Cannot manage billing, delete org, or remove owner.",
  },
  {
    key: "qa_policy",
    friendlyName: "Policy QA / Audit",
    email: "qa-policy@hps.test.local",
    membershipRole: "analyst",
    can: "Read all policies and runs, create test scenarios, mark items “needs review”.",
    cannot: "Cannot edit policies or approve overrides; cannot change any product data.",
  },
  {
    key: "underwriter",
    friendlyName: "Underwriter",
    email: "underwriter@hps.test.local",
    membershipRole: "analyst",
    can: "Create/edit deals, run analyses, propose offers, request overrides.",
    cannot: "Cannot change global policies, manage members, or self-approve overrides.",
  },
  {
    key: "viewer",
    friendlyName: "Read-only Viewer",
    email: "viewer@hps.test.local",
    membershipRole: "analyst",
    can: "View dashboards and shared deals/runs.",
    cannot: "No edits at all.",
  },
];

const REQUIRED_ENV = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_KEY",
] as const;

function envValue(keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const val = process.env[key];
    if (val) return val;
  }
  return undefined;
}

function requireEnv(keys: readonly string[], fallback?: string): string {
  const val = envValue(keys) ?? fallback;
  if (!val) {
    throw new Error(
      `Missing required env. Provide one of: ${keys.join(", ")} (or NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL for URL)`,
    );
  }
  return val;
}

function resolveSupabaseUrl(): string {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_PROJECT_URL;

  if (!url) {
    throw new Error(
      "Supabase URL not found. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL to the dev project URL.",
    );
  }

  if (!url.includes(DEV_PROJECT_REF)) {
    throw new Error(
      `Safety check failed: Supabase URL ${url} does not include expected dev ref ${DEV_PROJECT_REF}. Aborting.`,
    );
  }

  return url;
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/:/g, "-");
}

async function fetchAllUsers(
  client: ReturnType<typeof createClient>,
): Promise<User[]> {
  const users: User[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
): Promise<T[]> {
  const { data, error } = await supabase.from<T>(table).select("*");
  if (error) throw error;
  return data ?? [];
}

async function backupCurrentState(options: {
  supabase: SupabaseClient;
  client: ReturnType<typeof createClient>;
}): Promise<string> {
  const { supabase, client } = options;
  const [users, memberships, organizations] = await Promise.all([
    fetchAllUsers(client),
    fetchAllRows<MembershipRow>(supabase, "memberships"),
    fetchAllRows<OrganizationRow>(supabase, "organizations"),
  ]);

  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(
    BACKUP_DIR,
    `dev-auth-users-${timestampForFile()}.json`,
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    supabaseUrl: resolveSupabaseUrl(),
    counts: {
      users: users.length,
      memberships: memberships.length,
      organizations: organizations.length,
    },
    users,
    memberships,
    organizations,
  };

  await fs.writeFile(backupPath, JSON.stringify(payload, null, 2), "utf8");
  return backupPath;
}

async function deleteAllMemberships(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase
    .from("memberships")
    .delete()
    .neq("org_id", "00000000-0000-0000-0000-000000000000")
    .select("org_id, user_id");

  if (error) throw error;
  return data?.length ?? 0;
}

async function deleteAuthUsers(
  client: ReturnType<typeof createClient>,
  users: User[],
): Promise<number> {
  let deleted = 0;
  for (const user of users) {
    const { error } = await client.auth.admin.deleteUser(user.id);
    if (error) {
      throw new Error(
        `Failed to delete user ${user.id} (${user.email ?? "no-email"}): ${error.message}`,
      );
    }
    deleted += 1;
  }
  return deleted;
}

async function ensureDevOrg(
  supabase: SupabaseClient,
): Promise<OrganizationRow> {
  const { data, error } = await supabase
    .from<OrganizationRow>("organizations")
    .upsert(
      { id: DEV_ORG_ID, name: DEV_ORG_NAME },
      { onConflict: "id" },
    )
    .select("id, name, created_at")
    .single();

  if (error) throw error;
  return data;
}

async function seedUserWithMembership(options: {
  client: ReturnType<typeof createClient>;
  supabase: SupabaseClient;
  orgId: string;
  role: SeedRole;
}): Promise<User> {
  const { client, supabase, orgId, role } = options;

  const existingUsers = await fetchAllUsers(client);
  const already = existingUsers.find((u) => u.email === role.email);
  if (already) {
    await client.auth.admin.deleteUser(already.id);
  }

  const { data: created, error: createError } = await client.auth.admin
    .createUser({
      email: role.email,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: {
        seeded_by: "reset-dev-auth-users.ts",
        role_key: role.key,
      },
    });

  if (createError || !created.user) {
    throw new Error(
      `Failed to create user ${role.email}: ${createError?.message ?? "unknown error"}`,
    );
  }

  const { error: membershipError } = await supabase
    .from<MembershipRow>("memberships")
    .upsert(
      {
        org_id: orgId,
        user_id: created.user.id,
        role: role.membershipRole,
      },
      { onConflict: "org_id, user_id" },
    );

  if (membershipError) {
    throw new Error(
      `Failed to upsert membership for ${role.email}: ${membershipError.message}`,
    );
  }

  return created.user;
}

function renderRoleTable(rows: SeedRole[]): string {
  const header =
    "| Role key | Friendly name | Email | What they can do | What they cannot do |\n" +
    "|---|---|---|---|---|";

  const body = rows
    .map(
      (row) =>
        `| ${row.key} | ${row.friendlyName} | ${row.email} | ${row.can} | ${row.cannot} |`,
    )
    .join("\n");

  return `${header}\n${body}`;
}

async function main() {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceRoleKey = requireEnv(REQUIRED_ENV, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const supabase = client; // alias for clarity on table ops

  console.log("Backing up current auth.users + memberships + organizations …");
  const backupPath = await backupCurrentState({ supabase, client });
  console.log(`Backup written to ${backupPath}`);

  const currentUsers = await fetchAllUsers(client);
  console.log(`Found ${currentUsers.length} auth users before deletion.`);

  console.log("Deleting memberships …");
  const deletedMemberships = await deleteAllMemberships(supabase);
  console.log(`Deleted ${deletedMemberships} membership rows.`);

  console.log("Deleting auth users …");
  const deletedUsers = await deleteAuthUsers(client, currentUsers);
  console.log(`Deleted ${deletedUsers} auth users.`);

  console.log("Ensuring dev org exists …");
  const devOrg = await ensureDevOrg(supabase);
  console.log(`Dev org ready: ${devOrg.id} (${devOrg.name})`);

  console.log("Seeding standard dev users + memberships …");
  const seededUsers: User[] = [];
  for (const role of ROLE_MATRIX) {
    const user = await seedUserWithMembership({
      client,
      supabase,
      orgId: devOrg.id,
      role,
    });
    seededUsers.push(user);
    console.log(
      `  created ${role.key.padEnd(11)} ${role.email} -> membership role ${role.membershipRole}`,
    );
  }

  console.log("\nAll users seeded with password:", DEV_PASSWORD);
  console.log("\nMarkdown table:");
  console.log(renderRoleTable(ROLE_MATRIX));
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
