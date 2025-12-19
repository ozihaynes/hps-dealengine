import psycopg2, json
conn=psycopg2.connect('postgresql://postgres:Helibebcnof17@db.zjkihnihhqmnhpxkecpy.supabase.co:5432/postgres')
cur=conn.cursor()
cur.execute("select trigger_name, event_manipulation, event_object_table, action_statement from information_schema.triggers where event_object_table in ('ai_chat_threads','ai_chat_messages');")
print(json.dumps(cur.fetchall(), indent=2, default=str))
cur.close(); conn.close()
