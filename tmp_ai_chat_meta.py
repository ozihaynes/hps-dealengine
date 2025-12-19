import psycopg2, json
conn=psycopg2.connect('postgresql://postgres:Helibebcnof17@db.zjkihnihhqmnhpxkecpy.supabase.co:5432/postgres')
cur=conn.cursor()
queries = {
  'policies': "select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname='public' and tablename in ('ai_chat_threads','ai_chat_messages') order by tablename, policyname;",
  'indexes': "select tablename, indexname, indexdef from pg_indexes where schemaname='public' and tablename in ('ai_chat_threads','ai_chat_messages') order by tablename, indexname;",
  'triggers': "select tgname, tgrelid::regclass as table_name, pg_get_triggerdef(oid) as def from pg_trigger where not tgisinternal and tgrelid::regclass::text in ('public.ai_chat_threads','public.ai_chat_messages') order by table_name, tgname;"
}
for name, sql in queries.items():
    cur.execute(sql)
    print(f"## {name}")
    rows = cur.fetchall()
    for r in rows:
        print(json.dumps(r, default=str))
cur.close(); conn.close()
