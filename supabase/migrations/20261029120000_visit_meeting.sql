-- 회의록으로 입력한 방문 구조(data.meeting): {topic, attendeeCount, start, end, items[], extra[]}. 서버(zf_write 앞 검증 로직)가 값을 정리해 저장한다.
-- 있으면 객체여야 하고 items·extra는 배열, attendeeCount는 0 이상 정수. 두 번 실행해도 안전하다(이미 있으면 건너뜀).
do $$ begin
 if not exists (select 1 from pg_constraint where conname='zf_visits_meeting_shape') then
  alter table public.zf_visits add constraint zf_visits_meeting_shape check (
   not (data ? 'meeting')
   or (jsonb_typeof(data->'meeting')='object'
    and coalesce(jsonb_typeof(data->'meeting'->'items'),'')='array' and coalesce(jsonb_typeof(data->'meeting'->'extra'),'')='array'
    and coalesce(jsonb_typeof(data->'meeting'->'attendeeCount'),'')='number' and coalesce((data->'meeting'->>'attendeeCount')::numeric,-1)>=0));
 end if;
end $$;
