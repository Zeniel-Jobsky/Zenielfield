-- AI 정리 기록: 기입력 방문 결과를 AI 제안으로 고친 이력(data.aiEdits). 배열이어야 하며 entry(manual/ai)는 바꾸지 않는다.
-- 두 번 실행해도 안전하다(이미 있으면 건너뜀).
do $$ begin
 if not exists (select 1 from pg_constraint where conname='zf_visits_ai_edits_array') then
  alter table public.zf_visits add constraint zf_visits_ai_edits_array check (not (data ? 'aiEdits') or jsonb_typeof(data->'aiEdits')='array');
 end if;
end $$;
