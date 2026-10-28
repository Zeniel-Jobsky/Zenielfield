-- 방문 보고 종합 판정(data.judgment): {level, assessment, issues[], by, model, at, confirmedBy}. 서버(zf_write 앞 검증 로직)가 값을 정리해 저장한다.
-- 객체여야 하고 level은 정해진 4단계, issues는 배열이어야 한다. 두 번 실행해도 안전하다(이미 있으면 건너뜀).
do $$ begin
 if not exists (select 1 from pg_constraint where conname='zf_visits_judgment_shape') then
  alter table public.zf_visits add constraint zf_visits_judgment_shape check (
   not (data ? 'judgment') or jsonb_typeof(data->'judgment')='null'
   or (jsonb_typeof(data->'judgment')='object' and jsonb_typeof(data->'judgment'->'issues')='array' and data->'judgment'->>'level' in ('정상','관찰','주의','위험')));
 end if;
end $$;
