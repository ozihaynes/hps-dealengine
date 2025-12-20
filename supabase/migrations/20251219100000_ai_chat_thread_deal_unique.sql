-- Ensure a single thread per (org_id, user_id, persona, deal_id) and clean up dupes
begin;

with d as (
  select
    id,
    org_id,
    user_id,
    persona,
    deal_id,
    last_message_at,
    created_at,
    row_number() over (
      partition by org_id, user_id, persona, deal_id
      order by last_message_at desc, created_at desc
    ) as rn
  from public.ai_chat_threads
  where deal_id is not null
),
canon as (select * from d where rn = 1),
dupe as (select * from d where rn > 1)
update public.ai_chat_messages m
set thread_id = c.id
from dupe d
join canon c
  on c.org_id = d.org_id
 and c.user_id = d.user_id
 and c.persona = d.persona
 and c.deal_id = d.deal_id
where m.thread_id = d.id;

with d as (
  select
    id,
    org_id,
    user_id,
    persona,
    deal_id,
    last_message_at,
    created_at,
    row_number() over (
      partition by org_id, user_id, persona, deal_id
      order by last_message_at desc, created_at desc
    ) as rn
  from public.ai_chat_threads
  where deal_id is not null
),
dupe as (select * from d where rn > 1)
delete from public.ai_chat_threads t
using dupe d
where t.id = d.id;

create unique index if not exists idx_ai_chat_threads_persona_deal_unique
  on public.ai_chat_threads (org_id, user_id, persona, deal_id)
  where deal_id is not null;

commit;
