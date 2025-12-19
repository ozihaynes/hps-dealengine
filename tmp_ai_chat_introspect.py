import psycopg2, json
conn=psycopg2.connect('postgresql://postgres:Helibebcnof17@db.zjkihnihhqmnhpxkecpy.supabase.co:5432/postgres')
cur=conn.cursor()
cur.execute("select table_name, column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name in ('ai_chat_threads','ai_chat_messages') order by table_name, ordinal_position;")
print(json.dumps(cur.fetchall(), indent=2, default=str))
cur.close(); conn.close()
