-- AI 간편 등록과 직접 입력 분리: data.entry 판별값 + data.ai 기록 보존
alter table public.zf_visits add column entry text generated always as (coalesce(data->>'entry','manual')) stored;
alter table public.zf_visits add constraint zf_visits_entry_kind check(entry in ('manual','ai'));
alter table public.zf_visits add constraint zf_visits_entry_ai check((entry='ai')=(data ? 'ai'));
alter table public.zf_visits add constraint zf_visits_entry_ai_shape check(entry<>'ai' or (status='completed' and jsonb_typeof(data->'ai'->'input')='object' and jsonb_typeof(data->'ai'->'draft')='object'));
create index zf_visits_entry_idx on public.zf_visits(entry);
