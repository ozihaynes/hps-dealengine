


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "hps";


ALTER SCHEMA "hps" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."membership_role" AS ENUM (
    'analyst',
    'manager',
    'vp',
    'owner'
);


ALTER TYPE "public"."membership_role" OWNER TO "postgres";


CREATE TYPE "public"."policy_override_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."policy_override_status" OWNER TO "postgres";


CREATE TYPE "public"."policy_posture" AS ENUM (
    'conservative',
    'base',
    'aggressive'
);


ALTER TYPE "public"."policy_posture" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_ensure_policy_cmd"("_name" "text", "_table" "regclass", "_cmd" "text", "_using" "text", "_check" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
  DECLARE exists_policy boolean;
          sql           text;
          c             text := upper(_cmd);
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
        AND tablename  = split_part(_table::text, '.', 2)
        AND policyname = _name
    ) INTO exists_policy;

    IF NOT exists_policy THEN
      IF c IN ('SELECT','DELETE') THEN
        -- SELECT/DELETE: USING only
        sql := format('CREATE POLICY %I ON %s FOR %s USING (%s)',
                      _name, _table, _cmd, COALESCE(_using,'true'));
      ELSIF c = 'INSERT' THEN
        -- INSERT: CHECK only
        sql := format('CREATE POLICY %I ON %s FOR %s WITH CHECK (%s)',
                      _name, _table, _cmd, COALESCE(_check,'true'));
      ELSIF c = 'UPDATE' THEN
        -- UPDATE: USING + CHECK
        sql := format('CREATE POLICY %I ON %s FOR %s USING (%s) WITH CHECK (%s)',
                      _name, _table, _cmd, COALESCE(_using,'true'), COALESCE(_check,'true'));
      ELSE
        RAISE EXCEPTION 'Unsupported command % for CREATE POLICY', _cmd;
      END IF;
      EXECUTE sql;
    END IF;
  END;
  $$;


ALTER FUNCTION "public"."_ensure_policy_cmd"("_name" "text", "_table" "regclass", "_cmd" "text", "_using" "text", "_check" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_log_row_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_org uuid;
  v_row uuid;
  v_old jsonb;
  v_new jsonb;
begin
  if TG_OP = 'DELETE' then
    begin v_org := OLD.org_id; exception when others then v_org := null; end;
    begin v_row := OLD.id;     exception when others then v_row := null; end;
    v_old := to_jsonb(OLD);
    v_new := null;
  else
    begin v_org := NEW.org_id; exception when others then v_org := null; end;
    begin v_row := NEW.id;     exception when others then v_row := null; end;
    v_old := case when TG_OP='UPDATE' then to_jsonb(OLD) else null end;
    v_new := to_jsonb(NEW);
  end if;

  insert into public.audit_logs(
    org_id,
    actor_user_id,
    table_name,
    entity,
    row_id_uuid,
    action,
    diff
  )
  values (
    v_org,
    auth.uid(),
    TG_TABLE_NAME,
    TG_TABLE_NAME,
    v_row,
    TG_OP,
    jsonb_build_object('old', v_old, 'new', v_new)
  );

  return case when TG_OP='DELETE' then OLD else NEW end;
end
$$;


ALTER FUNCTION "public"."audit_log_row_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dbg_claim"("claim" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb ->> claim
$$;


ALTER FUNCTION "public"."dbg_claim"("claim" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dbg_uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$ select auth.uid() $$;


ALTER FUNCTION "public"."dbg_uid"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."dbg_uid"() IS 'Returns caller JWT sub (uuid) for PostgREST debugging.';



CREATE OR REPLACE FUNCTION "public"."debug_auth_context"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select jsonb_build_object(
    'uid', auth.uid(),
    'role', current_setting('request.jwt.claim.role', true),
    'sub',  current_setting('request.jwt.claim.sub', true),
    'claims', current_setting('request.jwt.claims', true)
  );
$$;


ALTER FUNCTION "public"."debug_auth_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_membership_for_self_vp"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."ensure_membership_for_self_vp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."export_schema_ddl"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  ddl text := '';
begin
  -- Schemas
  ddl := ddl || '-- Schemas' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(format('CREATE SCHEMA IF NOT EXISTS %I;', n.nspname), E'\n')
    from pg_namespace n
    where n.nspname not like 'pg_%' and n.nspname <> 'information_schema'
  ), '-- (none)') || E'\n\n';

  -- Enum types
  ddl := ddl || '-- Enum types' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(format(
      'CREATE TYPE %I.%I AS ENUM (%s);',
      n.nspname, t.typname,
      (select string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder)
       from pg_enum e where e.enumtypid = t.oid)
    ), E'\n')
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typtype = 'e'
      and n.nspname not like 'pg_%' and n.nspname <> 'information_schema'
  ), '-- (none)') || E'\n\n';

  -- Sequences (pg_sequences has increment_by / cache_size / min/max / cycle)
  ddl := ddl || '-- Sequences' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(format(
      'CREATE SEQUENCE %I.%I START %s INCREMENT %s MINVALUE %s MAXVALUE %s CACHE %s%s;',
      s.schemaname, s.sequencename, s.start_value, s.increment_by, s.min_value, s.max_value, s.cache_size,
      case when s.cycle then ' CYCLE' else '' end
    ), E'\n')
    from pg_sequences s
    where s.schemaname not in ('pg_catalog','information_schema')
  ), '-- (none)') || E'\n\n';

  -- Tables (columns only; constraints & indexes below)
  ddl := ddl || '-- Tables' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(format(
      'CREATE TABLE IF NOT EXISTS %I.%I (%s);',
      ns.nspname, c.relname,
      (
        select string_agg(coldef, E',\n  ' order by attnum)
        from (
          select
            a.attnum,
            format(
              '%I %s%s%s',
              a.attname,
              pg_catalog.format_type(a.atttypid, a.atttypmod),
              case when a.attidentity <> '' then
                format(' GENERATED %s AS IDENTITY',
                       case a.attidentity when 'a' then 'ALWAYS' else 'BY DEFAULT' end)
              else '' end,
              case
                when ad.adbin is not null and a.attidentity = '' then
                  ' DEFAULT ' || pg_get_expr(ad.adbin, ad.adrelid)
                else '' end
              || case when a.attnotnull then ' NOT NULL' else '' end
            ) as coldef
          from pg_attribute a
          left join pg_attrdef ad
            on ad.adrelid = a.attrelid and ad.adnum = a.attnum
          where a.attrelid = c.oid
            and a.attnum > 0
            and not a.attisdropped
        ) cols
      )
    ), E'\n\n')
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
    where c.relkind in ('r','p')  -- tables + partitioned tables
      and ns.nspname not like 'pg_%' and ns.nspname <> 'information_schema'
  ), '-- (none)') || E'\n\n';

  -- Constraints
  ddl := ddl || '-- Constraints' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(format(
      'ALTER TABLE ONLY %I.%I ADD CONSTRAINT %I %s;',
      n.nspname, c.relname, con.conname, pg_get_constraintdef(con.oid, true)
    ), E'\n')
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname not like 'pg_%' and n.nspname <> 'information_schema'
  ), '-- (none)') || E'\n\n';

  -- Indexes (exclude constraint-backed)
  ddl := ddl || '-- Indexes' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(pg_get_indexdef(i.indexrelid), E';\n') || ';'
    from pg_index i
    join pg_class t on t.oid = i.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname not like 'pg_%' and n.nspname <> 'information_schema'
      and i.indexrelid not in (select conindid from pg_constraint where conindid <> 0)
  ), '-- (none)') || E'\n\n';

  -- Views
  ddl := ddl || '-- Views' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(format(
      'CREATE OR REPLACE VIEW %I.%I AS %s',
      v.schemaname, v.viewname,
      pg_get_viewdef((quote_ident(v.schemaname)||'.'||quote_ident(v.viewname))::regclass, true)
    ), E';\n') || ';'
    from pg_views v
    where v.schemaname not like 'pg_%' and v.schemaname <> 'information_schema'
  ), '-- (none)') || E'\n\n';

  -- Materialized views
  ddl := ddl || '-- Materialized views' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(format(
      'CREATE MATERIALIZED VIEW IF NOT EXISTS %I.%I AS %s;',
      m.schemaname, m.matviewname, m.definition
    ), E'\n')
    from pg_matviews m
    where m.schemaname not like 'pg_%' and m.schemaname <> 'information_schema'
  ), '-- (none)') || E'\n\n';

  -- Functions (user-defined)
  ddl := ddl || '-- Functions' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(pg_get_functiondef(p.oid), E'\n\n')
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname not in ('pg_catalog','information_schema')
  ), '-- (none)') || E'\n\n';

  -- Triggers
  ddl := ddl || '-- Triggers' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(pg_get_triggerdef(t.oid, true) || ';', E'\n')
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname not like 'pg_%' and n.nspname <> 'information_schema'
  ), '-- (none)') || E'\n\n';

  -- Grants (tables)
  ddl := ddl || '-- Grants (tables)' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(format(
      'GRANT %s ON TABLE %I.%I TO %I;',
      privilege_type, table_schema, table_name, grantee
    ), E'\n')
    from information_schema.role_table_grants
    where table_schema not in ('pg_catalog','information_schema')
  ), '-- (none)') || E'\n\n';

  -- RLS enable/force
  ddl := ddl || '-- RLS enable/force' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(format(
      'ALTER TABLE %I.%I %s ROW LEVEL SECURITY%s;',
      n.nspname, c.relname,
      case when c.relrowsecurity then 'ENABLE' else 'DISABLE' end,
      case when c.relforcerowsecurity then ' FORCE' else '' end
    ), E'\n')
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and n.nspname not like 'pg_%' and n.nspname <> 'information_schema'
  ), '-- (none)') || E'\n\n';

  -- RLS policies
  ddl := ddl || '-- RLS policies' || E'\n';
  ddl := ddl || coalesce((
    select string_agg(
      format(
        'CREATE POLICY %I ON %I.%I FOR %s TO %s%s%s;',
        pol.policyname,
        pol.schemaname, pol.tablename,
        lower(pol.cmd),
        case when pol.roles is null
             then 'public'
             else array_to_string(ARRAY(select quote_ident(r) from unnest(pol.roles) as r), ', ')
        end,
        case when pol.qual is null then '' else E' USING ('||pol.qual||')' end,
        case when pol.with_check is null then '' else E' WITH CHECK ('||pol.with_check||')' end
      )
    , E'\n')
    from pg_policies pol
    where pol.schemaname not like 'pg_%' and pol.schemaname <> 'information_schema'
  ), '-- (none)') || E'\n\n';

  return ddl;
end
$$;


ALTER FUNCTION "public"."export_schema_ddl"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_caller_org"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select m.org_id
  from public.memberships m
  where m.user_id = auth.uid()
  order by m.created_at desc
  limit 1
$$;


ALTER FUNCTION "public"."get_caller_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member_of"("p_org" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = p_org
      and m.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_member_of"("p_org" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_manager"("p_org" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = p_org
      and m.user_id = auth.uid()
      and m.role in ('manager'::membership_role, 'vp'::membership_role)
  );
$$;


ALTER FUNCTION "public"."is_org_manager"("p_org" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_manager"("_org" "uuid", "_uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.memberships
    where org_id = _org
      and user_id = _uid
      and role in ('manager','vp')
  );
$$;


ALTER FUNCTION "public"."is_org_manager"("_org" "uuid", "_uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_member"("_org" "uuid", "_uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.memberships
    where org_id = _org and user_id = _uid
  );
$$;


ALTER FUNCTION "public"."is_org_member"("_org" "uuid", "_uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pgrst_reload"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$ SELECT pg_notify('pgrst','reload schema'); $$;


ALTER FUNCTION "public"."pgrst_reload"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."runs_bi_fill"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.input_hash  is null then
    new.input_hash  := encode(digest(coalesce(new.input::text,  'null'), 'sha256'), 'hex');
  end if;
  if new.output_hash is null then
    new.output_hash := encode(digest(coalesce(new.output::text, 'null'), 'sha256'), 'hex');
  end if;

  -- derive policy_hash from the referenced policy snapshot if present
  if new.policy_hash is null and new.policy_version_id is not null then
    select encode(digest(coalesce(pv.policy_json::text,'null'),'sha256'),'hex')
      into new.policy_hash
    from public.policy_versions pv
    where pv.id = new.policy_version_id;
  end if;

  if new.created_by is null then
    new.created_by := auth.uid();  -- supabase PostgREST injects the auth role here
  end if;
  if new.created_at is null then
    new.created_at := now();
  end if;

  return new;
end
$$;


ALTER FUNCTION "public"."runs_bi_fill"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."set_created_by"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sha256_hex_jsonb"("j" "jsonb") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select encode(digest(coalesce(j::text, 'null'), 'sha256'), 'hex')
$$;


ALTER FUNCTION "public"."sha256_hex_jsonb"("j" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end
$$;


ALTER FUNCTION "public"."tg_set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "hps"."attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "url" "text" NOT NULL,
    "meta_json" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "hps"."attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "hps"."deals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "labels" "text"[] DEFAULT '{}'::"text"[],
    "payload_json" "jsonb" NOT NULL,
    "results_json" "jsonb"
);


ALTER TABLE "hps"."deals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "hps"."double_close_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "input_json" "jsonb" NOT NULL,
    "result_json" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "hps"."double_close_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "hps"."scenarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "inputs_json" "jsonb" NOT NULL,
    "results_json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "hps"."scenarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."_default_org" AS
 SELECT "id" AS "org_id"
   FROM "public"."organizations"
  WHERE ("name" = 'HPS DealEngine'::"text")
 LIMIT 1;


ALTER VIEW "public"."_default_org" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "org_id" "uuid" NOT NULL,
    "actor_user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "entity" "text" NOT NULL,
    "entity_id" "uuid",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "table_name" "text",
    "row_id_uuid" "uuid",
    "diff" "jsonb"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Coarse audit via triggers; SELECT scoped by org membership.';



CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."deals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."deals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evidence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "run_id" "uuid",
    "kind" "text" NOT NULL,
    "storage_key" "text" NOT NULL,
    "sha256" "text" NOT NULL,
    "bytes" bigint NOT NULL,
    "mime_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "filename" "text",
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."evidence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."membership_role" DEFAULT 'analyst'::"public"."membership_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "posture" "text" DEFAULT 'base'::"text" NOT NULL,
    "tokens" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "policy_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    CONSTRAINT "policies_posture_check" CHECK (("posture" = ANY (ARRAY['conservative'::"text", 'base'::"text", 'aggressive'::"text"])))
);

ALTER TABLE ONLY "public"."policies" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "run_id" "uuid",
    "posture" "text" NOT NULL,
    "token_key" "text" NOT NULL,
    "requested_by" "uuid" DEFAULT "auth"."uid"(),
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "status" "public"."policy_override_status" DEFAULT 'pending'::"public"."policy_override_status",
    "justification" "text",
    "new_value" "jsonb" NOT NULL,
    "policy_version_id" "uuid"
);


ALTER TABLE "public"."policy_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "posture" "text" NOT NULL,
    "policy_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "change_summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    CONSTRAINT "policy_versions_posture_check" CHECK (("posture" = ANY (ARRAY['conservative'::"text", 'base'::"text", 'aggressive'::"text"])))
);

ALTER TABLE ONLY "public"."policy_versions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."policy_versions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."policy_versions_api" AS
 SELECT "id" AS "version_id",
    "org_id",
    "posture",
    "created_by" AS "actor_user_id",
    "created_at",
    "change_summary"
   FROM "public"."policy_versions" "pv";


ALTER VIEW "public"."policy_versions_api" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repair_rate_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "market_code" "text" NOT NULL,
    "as_of" "date" NOT NULL,
    "source" "text",
    "version" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "repair_psf_tiers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "repair_big5" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "line_item_rates" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."repair_rate_sets" OWNER TO "postgres";


COMMENT ON TABLE "public"."repair_rate_sets" IS 'Versioned repair rate sets (PSF tiers, Big 5, line item rates) scoped by org/market.';



CREATE TABLE IF NOT EXISTS "public"."runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "posture" "public"."policy_posture" NOT NULL,
    "policy_version_id" "uuid",
    "input" "jsonb" NOT NULL,
    "output" "jsonb" NOT NULL,
    "trace" "jsonb" NOT NULL,
    "input_hash" "text" NOT NULL,
    "output_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "policy_hash" "text",
    "policy_snapshot" "jsonb"
);

ALTER TABLE ONLY "public"."runs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."runs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."runs_api" AS
 SELECT "id",
    "org_id",
    "created_by",
    "posture",
    "policy_version_id",
    "created_at",
    "input_hash",
    "output_hash"
   FROM "public"."runs";


ALTER VIEW "public"."runs_api" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."runs_latest_per_fingerprint" AS
 SELECT "r"."id",
    "r"."org_id",
    "r"."created_by",
    "r"."posture",
    "r"."policy_version_id",
    "r"."input",
    "r"."output",
    "r"."trace",
    "r"."input_hash",
    "r"."output_hash",
    "r"."created_at",
    "r"."policy_hash",
    "r"."policy_snapshot"
   FROM ("public"."runs" "r"
     JOIN ( SELECT "runs"."org_id",
            "runs"."posture",
            "runs"."input_hash",
            "runs"."policy_hash",
            "max"("runs"."created_at") AS "max_created_at"
           FROM "public"."runs"
          GROUP BY "runs"."org_id", "runs"."posture", "runs"."input_hash", "runs"."policy_hash") "latest" ON ((("r"."org_id" = "latest"."org_id") AND ("r"."posture" = "latest"."posture") AND ("r"."input_hash" = "latest"."input_hash") AND (COALESCE("r"."policy_hash", 'Γêà'::"text") = COALESCE("latest"."policy_hash", 'Γêà'::"text")) AND ("r"."created_at" = "latest"."max_created_at"))));


ALTER VIEW "public"."runs_latest_per_fingerprint" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sandbox_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "posture" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sandbox_settings_posture_check" CHECK (("posture" = ANY (ARRAY['conservative'::"text", 'base'::"text", 'aggressive'::"text"])))
);


ALTER TABLE "public"."sandbox_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "default_posture" "text" DEFAULT 'base'::"text" NOT NULL,
    "default_market" "text" DEFAULT 'ORL'::"text" NOT NULL,
    "theme" "text" DEFAULT 'system'::"text" NOT NULL,
    "ui_prefs" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_settings_default_posture_check" CHECK (("default_posture" = ANY (ARRAY['conservative'::"text", 'base'::"text", 'aggressive'::"text"]))),
    CONSTRAINT "user_settings_theme_check" CHECK (("theme" = ANY (ARRAY['dark'::"text", 'light'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "hps"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "hps"."deals"
    ADD CONSTRAINT "deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "hps"."double_close_runs"
    ADD CONSTRAINT "double_close_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "hps"."scenarios"
    ADD CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("org_id", "user_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."policies"
    ADD CONSTRAINT "policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."policy_overrides"
    ADD CONSTRAINT "policy_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."policy_versions"
    ADD CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_rate_sets"
    ADD CONSTRAINT "repair_rate_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."runs"
    ADD CONSTRAINT "runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sandbox_settings"
    ADD CONSTRAINT "sandbox_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sandbox_settings"
    ADD CONSTRAINT "sandbox_settings_unique_org_posture" UNIQUE ("org_id", "posture");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_unique_user_org" UNIQUE ("user_id", "org_id");



CREATE INDEX "deals_created_at_idx" ON "hps"."deals" USING "btree" ("created_at" DESC);



CREATE INDEX "deals_labels_gin" ON "hps"."deals" USING "gin" ("labels");



CREATE INDEX "deals_payload_gin" ON "hps"."deals" USING "gin" ("payload_json");



CREATE INDEX "audit_org_created_idx" ON "public"."audit_logs" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "idx_evidence_org_deal" ON "public"."evidence" USING "btree" ("org_id", "deal_id");



CREATE INDEX "idx_evidence_run" ON "public"."evidence" USING "btree" ("run_id");



CREATE INDEX "idx_memberships_user_org" ON "public"."memberships" USING "btree" ("user_id", "org_id");



CREATE INDEX "idx_policy_versions_org" ON "public"."policy_versions" USING "btree" ("org_id");



CREATE INDEX "idx_user_settings_user_org" ON "public"."user_settings" USING "btree" ("user_id", "org_id");



CREATE INDEX "memberships_org_id_idx" ON "public"."memberships" USING "btree" ("org_id");



CREATE INDEX "memberships_user_id_idx" ON "public"."memberships" USING "btree" ("user_id");



CREATE UNIQUE INDEX "policies_one_active_per_posture" ON "public"."policies" USING "btree" ("org_id", "posture") WHERE ("is_active" = true);



CREATE INDEX "policies_org_posture_created_at_idx" ON "public"."policies" USING "btree" ("org_id", "posture", "created_at" DESC);



CREATE UNIQUE INDEX "policies_uni_org_posture_active" ON "public"."policies" USING "btree" ("org_id", "posture") WHERE ("is_active" = true);



CREATE INDEX "policy_versions_org_posture_created_at_idx" ON "public"."policy_versions" USING "btree" ("org_id", "posture", "created_at" DESC);



CREATE INDEX "repair_rate_sets_org_id_idx" ON "public"."repair_rate_sets" USING "btree" ("org_id");



CREATE UNIQUE INDEX "repair_rate_sets_org_market_active_uidx" ON "public"."repair_rate_sets" USING "btree" ("org_id", "market_code") WHERE "is_active";



CREATE INDEX "runs_creator_idx" ON "public"."runs" USING "btree" ("created_by");



CREATE INDEX "runs_org_created_idx" ON "public"."runs" USING "btree" ("org_id", "created_at" DESC);



CREATE UNIQUE INDEX "runs_uni_org_posture_hashes" ON "public"."runs" USING "btree" ("org_id", "posture", "input_hash", "policy_hash");



CREATE UNIQUE INDEX "runs_uni_org_posture_iohash_polhash" ON "public"."runs" USING "btree" ("org_id", "posture", "input_hash", "policy_hash");



CREATE OR REPLACE TRIGGER "audit_deals" AFTER INSERT OR DELETE OR UPDATE ON "public"."deals" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_row_change"();



CREATE OR REPLACE TRIGGER "audit_evidence" AFTER INSERT OR DELETE OR UPDATE ON "public"."evidence" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_row_change"();



CREATE OR REPLACE TRIGGER "audit_policies" AFTER INSERT OR DELETE OR UPDATE ON "public"."policies" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_row_change"();



CREATE OR REPLACE TRIGGER "audit_policy_versions" AFTER INSERT OR DELETE OR UPDATE ON "public"."policy_versions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_row_change"();



CREATE OR REPLACE TRIGGER "audit_repair_rate_sets" AFTER INSERT OR DELETE OR UPDATE ON "public"."repair_rate_sets" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_row_change"();



CREATE OR REPLACE TRIGGER "audit_runs" AFTER INSERT OR DELETE OR UPDATE ON "public"."runs" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_row_change"();



CREATE OR REPLACE TRIGGER "audit_sandbox_settings" AFTER INSERT OR DELETE OR UPDATE ON "public"."sandbox_settings" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_row_change"();



CREATE OR REPLACE TRIGGER "audit_user_settings" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_row_change"();



CREATE OR REPLACE TRIGGER "set_deals_updated_at" BEFORE UPDATE ON "public"."deals" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_evidence_updated_at" BEFORE UPDATE ON "public"."evidence" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_sandbox_settings_updated_at" BEFORE UPDATE ON "public"."sandbox_settings" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_runs_bi_fill" BEFORE INSERT ON "public"."runs" FOR EACH ROW EXECUTE FUNCTION "public"."runs_bi_fill"();



CREATE OR REPLACE TRIGGER "trg_runs_set_created_by" BEFORE INSERT ON "public"."runs" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by"();



ALTER TABLE ONLY "hps"."attachments"
    ADD CONSTRAINT "attachments_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "hps"."deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "hps"."double_close_runs"
    ADD CONSTRAINT "double_close_runs_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "hps"."deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "hps"."scenarios"
    ADD CONSTRAINT "scenarios_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "hps"."deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."policy_overrides"
    ADD CONSTRAINT "policy_overrides_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "public"."policy_versions"("id");



ALTER TABLE ONLY "public"."repair_rate_sets"
    ADD CONSTRAINT "repair_rate_sets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."runs"
    ADD CONSTRAINT "runs_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "public"."policy_versions"("id");



ALTER TABLE ONLY "public"."sandbox_settings"
    ADD CONSTRAINT "sandbox_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Analysts request overrides" ON "public"."policy_overrides" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "memberships"."org_id"
   FROM "public"."memberships"
  WHERE ("memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "Managers approve overrides" ON "public"."policy_overrides" FOR UPDATE USING (("org_id" IN ( SELECT "memberships"."org_id"
   FROM "public"."memberships"
  WHERE (("memberships"."user_id" = "auth"."uid"()) AND ("memberships"."role" = ANY (ARRAY['manager'::"public"."membership_role", 'vp'::"public"."membership_role", 'owner'::"public"."membership_role"])))))) WITH CHECK (("org_id" IN ( SELECT "memberships"."org_id"
   FROM "public"."memberships"
  WHERE (("memberships"."user_id" = "auth"."uid"()) AND ("memberships"."role" = ANY (ARRAY['manager'::"public"."membership_role", 'vp'::"public"."membership_role", 'owner'::"public"."membership_role"]))))));



CREATE POLICY "Org members view overrides" ON "public"."policy_overrides" FOR SELECT USING (("org_id" IN ( SELECT "memberships"."org_id"
   FROM "public"."memberships"
  WHERE ("memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can upload own org evidence" ON "public"."evidence" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "memberships"."org_id"
   FROM "public"."memberships"
  WHERE ("memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own org evidence" ON "public"."evidence" FOR SELECT USING (("org_id" IN ( SELECT "memberships"."org_id"
   FROM "public"."memberships"
  WHERE ("memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "audit_insert" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "audit_logs"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_select_in_org" ON "public"."audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "audit_logs"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "audit_select" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "audit_logs"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."deals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deals_delete_manager" ON "public"."deals" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "deals"."org_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['manager'::"public"."membership_role", 'vp'::"public"."membership_role"]))))));



CREATE POLICY "deals_insert_in_org" ON "public"."deals" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "deals"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "deals_select_in_org" ON "public"."deals" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "deals"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "deals_update_in_org" ON "public"."deals" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "deals"."org_id") AND ("m"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "deals"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."evidence" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evidence_delete" ON "public"."evidence" FOR DELETE USING ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "evidence"."org_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "evidence_insert" ON "public"."evidence" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "evidence"."org_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "evidence_select" ON "public"."evidence" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "evidence"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "evidence_update" ON "public"."evidence" FOR UPDATE USING ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "evidence"."org_id") AND ("m"."user_id" = "auth"."uid"())))))) WITH CHECK ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "evidence"."org_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "mbr_delete_self" ON "public"."memberships" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "mbr_insert_self" ON "public"."memberships" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "mbr_select_self" ON "public"."memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "mbr_self_select" ON "public"."memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "mbr_update_self" ON "public"."memberships" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "membership_delete_self" ON "public"."memberships" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "membership_insert_self" ON "public"."memberships" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "membership_select_self" ON "public"."memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "membership_update_self" ON "public"."memberships" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_select" ON "public"."organizations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "organizations"."id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orgs:select_by_membership" ON "public"."organizations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "organizations"."id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "pol_read_by_membership_simple" ON "public"."policies" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policies"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "pol_read_by_org" ON "public"."policies" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policies"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "pol_select_by_membership" ON "public"."policies" FOR SELECT TO "authenticated" USING ("public"."is_member_of"("org_id"));



CREATE POLICY "pol_select_org_members" ON "public"."policies" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policies"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "pol_select_visible_to_members" ON "public"."policies" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policies"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "policies_delete" ON "public"."policies" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policies"."org_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = 'vp'::"public"."membership_role")))));



CREATE POLICY "policies_insert" ON "public"."policies" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policies"."org_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['manager'::"public"."membership_role", 'vp'::"public"."membership_role"]))))));



CREATE POLICY "policies_select" ON "public"."policies" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policies"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "policies_select_by_membership" ON "public"."policies" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policies"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "policies_update" ON "public"."policies" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policies"."org_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['manager'::"public"."membership_role", 'vp'::"public"."membership_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policies"."org_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['manager'::"public"."membership_role", 'vp'::"public"."membership_role"]))))));



ALTER TABLE "public"."policy_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."policy_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "policy_versions_insert" ON "public"."policy_versions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policy_versions"."org_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['manager'::"public"."membership_role", 'vp'::"public"."membership_role"]))))));



CREATE POLICY "policy_versions_select" ON "public"."policy_versions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policy_versions"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "policy_versions_select_by_membership" ON "public"."policy_versions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policy_versions"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "polv_read_by_org" ON "public"."policy_versions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policy_versions"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "polv_select_by_membership" ON "public"."policy_versions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "policy_versions"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."repair_rate_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "repair_rate_sets_delete_manager" ON "public"."repair_rate_sets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "repair_rate_sets"."org_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['manager'::"public"."membership_role", 'vp'::"public"."membership_role"]))))));



CREATE POLICY "repair_rate_sets_insert_manager" ON "public"."repair_rate_sets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "repair_rate_sets"."org_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['manager'::"public"."membership_role", 'vp'::"public"."membership_role"]))))));



CREATE POLICY "repair_rate_sets_select_in_org" ON "public"."repair_rate_sets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "repair_rate_sets"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "repair_rate_sets_update_manager" ON "public"."repair_rate_sets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "repair_rate_sets"."org_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['manager'::"public"."membership_role", 'vp'::"public"."membership_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "repair_rate_sets"."org_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['manager'::"public"."membership_role", 'vp'::"public"."membership_role"]))))));



ALTER TABLE "public"."runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "runs_insert" ON "public"."runs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "runs"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "runs_select" ON "public"."runs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "runs"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "runs_update" ON "public"."runs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "runs"."org_id") AND ("m"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "runs"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."sandbox_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sandbox_settings_delete" ON "public"."sandbox_settings" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "sandbox_settings"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "sandbox_settings_insert" ON "public"."sandbox_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "sandbox_settings"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "sandbox_settings_select" ON "public"."sandbox_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "sandbox_settings"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "sandbox_settings_update" ON "public"."sandbox_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "sandbox_settings"."org_id") AND ("m"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "sandbox_settings"."org_id") AND ("m"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_settings_delete" ON "public"."user_settings" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "user_settings"."org_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "user_settings_insert" ON "public"."user_settings" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "user_settings"."org_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "user_settings_select" ON "public"."user_settings" FOR SELECT USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "user_settings"."org_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "user_settings_update" ON "public"."user_settings" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "user_settings"."org_id") AND ("m"."user_id" = "auth"."uid"())))))) WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."org_id" = "user_settings"."org_id") AND ("m"."user_id" = "auth"."uid"()))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "hps" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "authenticator";

























































































































































GRANT ALL ON FUNCTION "public"."_ensure_policy_cmd"("_name" "text", "_table" "regclass", "_cmd" "text", "_using" "text", "_check" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_ensure_policy_cmd"("_name" "text", "_table" "regclass", "_cmd" "text", "_using" "text", "_check" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_ensure_policy_cmd"("_name" "text", "_table" "regclass", "_cmd" "text", "_using" "text", "_check" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_log_row_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_log_row_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_log_row_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."dbg_claim"("claim" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."dbg_claim"("claim" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dbg_claim"("claim" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."dbg_uid"() TO "anon";
GRANT ALL ON FUNCTION "public"."dbg_uid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."dbg_uid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_auth_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_auth_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_auth_context"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_membership_for_self_vp"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_membership_for_self_vp"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_membership_for_self_vp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_membership_for_self_vp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."export_schema_ddl"() TO "anon";
GRANT ALL ON FUNCTION "public"."export_schema_ddl"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."export_schema_ddl"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_caller_org"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_caller_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_caller_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_caller_org"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_caller_org"() TO "authenticator";



GRANT ALL ON FUNCTION "public"."is_member_of"("p_org" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member_of"("p_org" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member_of"("p_org" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_manager"("p_org" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_manager"("p_org" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_manager"("p_org" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_manager"("_org" "uuid", "_uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_manager"("_org" "uuid", "_uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_manager"("_org" "uuid", "_uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_member"("_org" "uuid", "_uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_member"("_org" "uuid", "_uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_member"("_org" "uuid", "_uid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."pgrst_reload"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pgrst_reload"() TO "anon";
GRANT ALL ON FUNCTION "public"."pgrst_reload"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgrst_reload"() TO "service_role";



GRANT ALL ON FUNCTION "public"."runs_bi_fill"() TO "anon";
GRANT ALL ON FUNCTION "public"."runs_bi_fill"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."runs_bi_fill"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_created_by"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_created_by"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_created_by"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sha256_hex_jsonb"("j" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."sha256_hex_jsonb"("j" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sha256_hex_jsonb"("j" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "hps"."attachments" TO "service_role";



GRANT ALL ON TABLE "hps"."deals" TO "service_role";



GRANT ALL ON TABLE "hps"."double_close_runs" TO "service_role";



GRANT ALL ON TABLE "hps"."scenarios" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."_default_org" TO "anon";
GRANT ALL ON TABLE "public"."_default_org" TO "authenticated";
GRANT ALL ON TABLE "public"."_default_org" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."deals" TO "anon";
GRANT ALL ON TABLE "public"."deals" TO "authenticated";
GRANT ALL ON TABLE "public"."deals" TO "service_role";



GRANT ALL ON TABLE "public"."evidence" TO "anon";
GRANT ALL ON TABLE "public"."evidence" TO "authenticated";
GRANT ALL ON TABLE "public"."evidence" TO "service_role";



GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";



GRANT ALL ON TABLE "public"."policies" TO "anon";
GRANT ALL ON TABLE "public"."policies" TO "authenticated";
GRANT ALL ON TABLE "public"."policies" TO "service_role";



GRANT ALL ON TABLE "public"."policy_overrides" TO "anon";
GRANT ALL ON TABLE "public"."policy_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."policy_versions" TO "anon";
GRANT ALL ON TABLE "public"."policy_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_versions" TO "service_role";



GRANT ALL ON TABLE "public"."policy_versions_api" TO "anon";
GRANT ALL ON TABLE "public"."policy_versions_api" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_versions_api" TO "service_role";



GRANT ALL ON TABLE "public"."repair_rate_sets" TO "anon";
GRANT ALL ON TABLE "public"."repair_rate_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_rate_sets" TO "service_role";



GRANT ALL ON TABLE "public"."runs" TO "anon";
GRANT ALL ON TABLE "public"."runs" TO "authenticated";
GRANT ALL ON TABLE "public"."runs" TO "service_role";



GRANT ALL ON TABLE "public"."runs_api" TO "anon";
GRANT ALL ON TABLE "public"."runs_api" TO "authenticated";
GRANT ALL ON TABLE "public"."runs_api" TO "service_role";



GRANT ALL ON TABLE "public"."runs_latest_per_fingerprint" TO "anon";
GRANT ALL ON TABLE "public"."runs_latest_per_fingerprint" TO "authenticated";
GRANT ALL ON TABLE "public"."runs_latest_per_fingerprint" TO "service_role";



GRANT ALL ON TABLE "public"."sandbox_settings" TO "anon";
GRANT ALL ON TABLE "public"."sandbox_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."sandbox_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "hps" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "hps" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































