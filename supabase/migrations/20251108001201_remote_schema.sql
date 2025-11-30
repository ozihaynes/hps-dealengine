drop extension if exists "pg_net";

create schema if not exists "hps";

create type "public"."membership_role" as enum ('analyst', 'manager', 'vp');

create type "public"."policy_posture" as enum ('conservative', 'base', 'aggressive');

create sequence "public"."audit_logs_id_seq";

drop policy "tenant can insert own policies" on "public"."policies";

drop policy "tenant can select own policies" on "public"."policies";

drop policy "tenant can update own policies" on "public"."policies";

drop index if exists "public"."runs_uni_org_posture_iohash_polhash";


  create table "hps"."attachments" (
    "id" uuid not null default gen_random_uuid(),
    "deal_id" uuid not null,
    "type" text not null,
    "url" text not null,
    "meta_json" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
      );



  create table "hps"."deals" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" text,
    "status" text default 'draft'::text,
    "labels" text[] default '{}'::text[],
    "payload_json" jsonb not null,
    "results_json" jsonb
      );



  create table "hps"."double_close_runs" (
    "id" uuid not null default gen_random_uuid(),
    "deal_id" uuid not null,
    "input_json" jsonb not null,
    "result_json" jsonb not null,
    "created_at" timestamp with time zone default now()
      );



  create table "hps"."scenarios" (
    "id" uuid not null default gen_random_uuid(),
    "deal_id" uuid not null,
    "name" text not null,
    "inputs_json" jsonb not null,
    "results_json" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."audit_logs" (
    "id" bigint not null default nextval('public.audit_logs_id_seq'::regclass),
    "org_id" uuid not null,
    "actor_user_id" uuid not null,
    "action" text not null,
    "entity" text not null,
    "entity_id" uuid,
    "details" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."audit_logs" enable row level security;


  create table "public"."memberships" (
    "org_id" uuid not null,
    "user_id" uuid not null,
    "role" public.membership_role not null default 'analyst'::public.membership_role,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."memberships" enable row level security;


  create table "public"."organizations" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."organizations" enable row level security;

alter table "public"."policies" add column "policy_json" jsonb not null default '{}'::jsonb;

alter table "public"."policies" alter column "is_active" set default true;

alter table "public"."policies" alter column "is_active" set not null;

alter table "public"."policies" alter column "tokens" set default '{}'::jsonb;

alter table "public"."policy_versions" alter column "created_by" set not null;

alter table "public"."policy_versions" alter column "policy_json" set not null;

alter table "public"."policy_versions" enable row level security;

alter table "public"."runs" add column "created_at" timestamp with time zone not null default now();

alter table "public"."runs" add column "created_by" uuid not null;

alter table "public"."runs" add column "input" jsonb not null;

alter table "public"."runs" add column "output" jsonb not null;

alter table "public"."runs" add column "output_hash" text not null;

alter table "public"."runs" add column "trace" jsonb not null;

alter table "public"."runs" alter column "input_hash" set not null;

alter table "public"."runs" alter column "org_id" set not null;

alter table "public"."runs" alter column "posture" set not null;

alter table "public"."runs" alter column "posture" set data type public.policy_posture using "posture"::public.policy_posture;

alter table "public"."runs" enable row level security;

alter sequence "public"."audit_logs_id_seq" owned by "public"."audit_logs"."id";

CREATE UNIQUE INDEX attachments_pkey ON hps.attachments USING btree (id);

CREATE INDEX deals_created_at_idx ON hps.deals USING btree (created_at DESC);

CREATE INDEX deals_labels_gin ON hps.deals USING gin (labels);

CREATE INDEX deals_payload_gin ON hps.deals USING gin (payload_json);

CREATE UNIQUE INDEX deals_pkey ON hps.deals USING btree (id);

CREATE UNIQUE INDEX double_close_runs_pkey ON hps.double_close_runs USING btree (id);

CREATE UNIQUE INDEX scenarios_pkey ON hps.scenarios USING btree (id);

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE INDEX audit_org_created_idx ON public.audit_logs USING btree (org_id, created_at DESC);

CREATE INDEX idx_memberships_user_org ON public.memberships USING btree (user_id, org_id);

CREATE INDEX idx_policy_versions_org ON public.policy_versions USING btree (org_id);

CREATE INDEX memberships_org_id_idx ON public.memberships USING btree (org_id);

CREATE UNIQUE INDEX memberships_pkey ON public.memberships USING btree (org_id, user_id);

CREATE INDEX memberships_user_id_idx ON public.memberships USING btree (user_id);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE INDEX policy_versions_org_posture_created_at_idx ON public.policy_versions USING btree (org_id, posture, created_at DESC);

CREATE INDEX runs_creator_idx ON public.runs USING btree (created_by);

CREATE UNIQUE INDEX runs_dedupe_unique ON public.runs USING btree (org_id, posture, input_hash, policy_hash);

CREATE INDEX runs_org_created_idx ON public.runs USING btree (org_id, created_at DESC);

CREATE UNIQUE INDEX runs_uni_org_posture_iohash_polhash ON public.runs USING btree (org_id, posture, input_hash, policy_hash);

alter table "hps"."attachments" add constraint "attachments_pkey" PRIMARY KEY using index "attachments_pkey";

alter table "hps"."deals" add constraint "deals_pkey" PRIMARY KEY using index "deals_pkey";

alter table "hps"."double_close_runs" add constraint "double_close_runs_pkey" PRIMARY KEY using index "double_close_runs_pkey";

alter table "hps"."scenarios" add constraint "scenarios_pkey" PRIMARY KEY using index "scenarios_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."memberships" add constraint "memberships_pkey" PRIMARY KEY using index "memberships_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "hps"."attachments" add constraint "attachments_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES hps.deals(id) ON DELETE CASCADE not valid;

alter table "hps"."attachments" validate constraint "attachments_deal_id_fkey";

alter table "hps"."double_close_runs" add constraint "double_close_runs_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES hps.deals(id) ON DELETE CASCADE not valid;

alter table "hps"."double_close_runs" validate constraint "double_close_runs_deal_id_fkey";

alter table "hps"."scenarios" add constraint "scenarios_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES hps.deals(id) ON DELETE CASCADE not valid;

alter table "hps"."scenarios" validate constraint "scenarios_deal_id_fkey";

alter table "public"."memberships" add constraint "memberships_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."memberships" validate constraint "memberships_org_id_fkey";

alter table "public"."policy_versions" add constraint "policy_versions_posture_check" CHECK ((posture = ANY (ARRAY['conservative'::text, 'base'::text, 'aggressive'::text]))) not valid;

alter table "public"."policy_versions" validate constraint "policy_versions_posture_check";

set check_function_bodies = off;

create or replace view "public"."_default_org" as  SELECT id AS org_id
   FROM public.organizations
  WHERE (name = 'HPS DealEngine'::text)
 LIMIT 1;


CREATE OR REPLACE FUNCTION public.ensure_membership_for_self_vp()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_org uuid;
begin
  select org_id into v_org from public._default_org limit 1;
  if v_org is null then
    insert into public.organizations(name) values ('HPS DealEngine') returning id into v_org;
  end if;

  insert into public.memberships(org_id, user_id, role)
  values (v_org, auth.uid(), 'vp')
  on conflict (org_id, user_id) do update set role = excluded.role;

  return v_org;
end
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_manager(_org uuid, _uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.memberships
    where org_id = _org
      and user_id = _uid
      and role in ('manager','vp')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid, _uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.memberships
    where org_id = _org and user_id = _uid
  );
$function$
;

CREATE OR REPLACE FUNCTION public.pgrst_reload()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$ SELECT pg_notify('pgrst','reload schema'); $function$
;

create or replace view "public"."runs_api" as  SELECT id,
    org_id,
    created_by,
    posture,
    policy_version_id,
    created_at,
    input_hash,
    output_hash
   FROM public.runs;


grant delete on table "hps"."attachments" to "service_role";

grant insert on table "hps"."attachments" to "service_role";

grant references on table "hps"."attachments" to "service_role";

grant select on table "hps"."attachments" to "service_role";

grant trigger on table "hps"."attachments" to "service_role";

grant truncate on table "hps"."attachments" to "service_role";

grant update on table "hps"."attachments" to "service_role";

grant delete on table "hps"."deals" to "service_role";

grant insert on table "hps"."deals" to "service_role";

grant references on table "hps"."deals" to "service_role";

grant select on table "hps"."deals" to "service_role";

grant trigger on table "hps"."deals" to "service_role";

grant truncate on table "hps"."deals" to "service_role";

grant update on table "hps"."deals" to "service_role";

grant delete on table "hps"."double_close_runs" to "service_role";

grant insert on table "hps"."double_close_runs" to "service_role";

grant references on table "hps"."double_close_runs" to "service_role";

grant select on table "hps"."double_close_runs" to "service_role";

grant trigger on table "hps"."double_close_runs" to "service_role";

grant truncate on table "hps"."double_close_runs" to "service_role";

grant update on table "hps"."double_close_runs" to "service_role";

grant delete on table "hps"."scenarios" to "service_role";

grant insert on table "hps"."scenarios" to "service_role";

grant references on table "hps"."scenarios" to "service_role";

grant select on table "hps"."scenarios" to "service_role";

grant trigger on table "hps"."scenarios" to "service_role";

grant truncate on table "hps"."scenarios" to "service_role";

grant update on table "hps"."scenarios" to "service_role";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."memberships" to "anon";

grant insert on table "public"."memberships" to "anon";

grant references on table "public"."memberships" to "anon";

grant select on table "public"."memberships" to "anon";

grant trigger on table "public"."memberships" to "anon";

grant truncate on table "public"."memberships" to "anon";

grant update on table "public"."memberships" to "anon";

grant delete on table "public"."memberships" to "authenticated";

grant insert on table "public"."memberships" to "authenticated";

grant references on table "public"."memberships" to "authenticated";

grant select on table "public"."memberships" to "authenticated";

grant trigger on table "public"."memberships" to "authenticated";

grant truncate on table "public"."memberships" to "authenticated";

grant update on table "public"."memberships" to "authenticated";

grant delete on table "public"."memberships" to "service_role";

grant insert on table "public"."memberships" to "service_role";

grant references on table "public"."memberships" to "service_role";

grant select on table "public"."memberships" to "service_role";

grant trigger on table "public"."memberships" to "service_role";

grant truncate on table "public"."memberships" to "service_role";

grant update on table "public"."memberships" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant references on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";


  create policy "audit_insert"
  on "public"."audit_logs"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = audit_logs.org_id) AND (m.user_id = auth.uid())))));



  create policy "audit_select"
  on "public"."audit_logs"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = audit_logs.org_id) AND (m.user_id = auth.uid())))));



  create policy "m_insert"
  on "public"."memberships"
  as permissive
  for insert
  to public
with check (public.is_org_manager(org_id, auth.uid()));



  create policy "m_insert_self"
  on "public"."memberships"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "m_select"
  on "public"."memberships"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR public.is_org_manager(org_id, auth.uid())));



  create policy "m_select_own"
  on "public"."memberships"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "m_update"
  on "public"."memberships"
  as permissive
  for update
  to public
using (public.is_org_manager(org_id, auth.uid()))
with check (public.is_org_manager(org_id, auth.uid()));



  create policy "m_update_self"
  on "public"."memberships"
  as permissive
  for update
  to public
using ((user_id = auth.uid()));



  create policy "mem_select"
  on "public"."memberships"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "org_select"
  on "public"."organizations"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = organizations.id) AND (m.user_id = auth.uid())))));



  create policy "orgs:select_by_membership"
  on "public"."organizations"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = organizations.id) AND (m.user_id = auth.uid())))));



  create policy "pol_insert"
  on "public"."policies"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = policies.org_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['manager'::public.membership_role, 'vp'::public.membership_role]))))));



  create policy "pol_select"
  on "public"."policies"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = policies.org_id) AND (m.user_id = auth.uid())))));



  create policy "pol_update"
  on "public"."policies"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = policies.org_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['manager'::public.membership_role, 'vp'::public.membership_role]))))));



  create policy "policies_modify_org"
  on "public"."policies"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = policies.org_id) AND (m.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = policies.org_id) AND (m.user_id = auth.uid())))));



  create policy "policies_select_org"
  on "public"."policies"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = policies.org_id) AND (m.user_id = auth.uid())))));



  create policy "policy_versions_insert_org"
  on "public"."policy_versions"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT m.org_id
   FROM public.memberships m
  WHERE (m.user_id = auth.uid()))));



  create policy "policy_versions_select_by_org"
  on "public"."policy_versions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = policy_versions.org_id) AND (m.user_id = auth.uid())))));



  create policy "policy_versions_select_org"
  on "public"."policy_versions"
  as permissive
  for select
  to public
using ((org_id IN ( SELECT m.org_id
   FROM public.memberships m
  WHERE (m.user_id = auth.uid()))));



  create policy "pv_insert"
  on "public"."policy_versions"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = policy_versions.org_id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['manager'::public.membership_role, 'vp'::public.membership_role]))))));



  create policy "pv_select"
  on "public"."policy_versions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = policy_versions.org_id) AND (m.user_id = auth.uid())))));



  create policy "pv_select_same_org"
  on "public"."policy_versions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = policy_versions.org_id) AND (m.user_id = auth.uid())))));



  create policy "runs_insert"
  on "public"."runs"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = runs.org_id) AND (m.user_id = auth.uid())))));



  create policy "runs_select"
  on "public"."runs"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.org_id = runs.org_id) AND (m.user_id = auth.uid())))));



