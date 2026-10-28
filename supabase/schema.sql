-- Fresh ZeniField project only. No existing D1 or ZeniManager data is changed.
create table public.zf_domains (
 id text primary key, code text not null unique, name text not null,
 active integer not null default 1 check(active in (0,1)), version integer not null,
 data jsonb not null check(data->>'id'=id and data->>'code'=code and data->>'name'=name and (data->>'active')::integer=active and (data->>'version')::integer=version)
);
create table public.zf_users (
 id text primary key, subject text unique, email text not null unique check(email=lower(email)),
 name text not null, role text not null check(role in ('admin','director','lead','partlead','manager')),
 team text not null, part text not null, active integer not null default 1 check(active in (0,1)), version integer not null default 1,
 domains text[] not null default '{}'
);
create table public.zf_sites (
 id text primary key, code text not null unique, team text not null, part text not null, version integer not null, domain text references public.zf_domains(id),
 data jsonb not null check(data->>'id'=id and (data->>'version')::integer=version and data->>'team'=team and data->>'part'=part and data->>'code'=code and coalesce(data->>'domain','')=coalesce(domain,''))
);
create index zf_sites_domain_idx on public.zf_sites(domain);
create table public.zf_stores (
 id text primary key, site_id text not null references public.zf_sites(id), code text not null unique, version integer not null,
 data jsonb not null check(data->>'id'=id and data->>'siteId'=site_id and data->>'code'=code and (data->>'version')::integer=version), unique(id,site_id)
);
create index zf_stores_site_idx on public.zf_stores(site_id);
create table public.zf_assignments (
 id uuid primary key default gen_random_uuid(), target_type text not null check(target_type in ('site','store')),
 site_id text not null references public.zf_sites(id), store_id text,
 user_id text not null references public.zf_users(id), start_date date not null, end_date date,
 check((target_type='site' and store_id is null) or (target_type='store' and store_id is not null)),
 foreign key(store_id,site_id) references public.zf_stores(id,site_id), check(end_date is null or end_date>=start_date)
);
create index zf_assignments_user_idx on public.zf_assignments(user_id,end_date);
create index zf_assignments_site_idx on public.zf_assignments(site_id);
create index zf_assignments_store_idx on public.zf_assignments(store_id,site_id);
create unique index zf_assignment_active on public.zf_assignments(target_type,site_id,coalesce(store_id,''),user_id) where end_date is null;
create table public.zf_visits (
 id text primary key, site_id text not null references public.zf_sites(id), store_id text,
 target_type text not null check(target_type in ('site','store')), visitor_id text not null references public.zf_users(id),
 status text not null check(status in ('planned','completed','cancelled')), requirement_id text, version integer not null,
 data jsonb not null check(data->>'id'=id and data->>'siteId'=site_id and data->>'targetType'=target_type and data->>'status'=status and data->>'visitorId'=visitor_id and (data->>'version')::integer=version),
 check((target_type='site' and store_id is null) or(target_type='store' and store_id is not null)),
 check(coalesce(data->>'storeId','')=coalesce(store_id,'')), foreign key(store_id,site_id) references public.zf_stores(id,site_id),
 check(status<>'completed' or (data->>'actualDate' is not null and length(trim(data->>'detail'))>0)),
 check(status<>'planned' or data->>'plannedDate' is not null), check(status<>'cancelled' or length(trim(data->>'cancelReason'))>0),
 entry text generated always as (coalesce(data->>'entry','manual')) stored check(entry in ('manual','ai')),
 check((entry='ai')=(data ? 'ai')), check(entry<>'ai' or (status='completed' and jsonb_typeof(data->'ai'->'input')='object' and jsonb_typeof(data->'ai'->'draft')='object'))
);
create index zf_visits_entry_idx on public.zf_visits(entry);
create index zf_visits_site_idx on public.zf_visits(site_id);
create index zf_visits_store_idx on public.zf_visits(store_id,site_id);
create index zf_visits_visitor_idx on public.zf_visits(visitor_id);
create unique index zf_visits_requirement_active on public.zf_visits(requirement_id) where requirement_id is not null and status<>'cancelled';
create table public.zf_actions (
 id text primary key, site_id text not null references public.zf_sites(id), store_id text,
 target_type text not null check(target_type in ('site','store')), visit_id text references public.zf_visits(id),
 owner_id text not null references public.zf_users(id), state text not null check(state in ('조치 예정','처리 중','보류','완료')), version integer not null,
 data jsonb not null check(data->>'id'=id and data->>'siteId'=site_id and data->>'targetType'=target_type and data->>'ownerId'=owner_id and data->>'state'=state and (data->>'version')::integer=version),
 check((target_type='site' and store_id is null) or(target_type='store' and store_id is not null)),
 check(coalesce(data->>'storeId','')=coalesce(store_id,'')), foreign key(store_id,site_id) references public.zf_stores(id,site_id)
);
create index zf_actions_site_idx on public.zf_actions(site_id);
create index zf_actions_store_idx on public.zf_actions(store_id,site_id);
create index zf_actions_owner_idx on public.zf_actions(owner_id);
create index zf_actions_visit_idx on public.zf_actions(visit_id);
create table public.zf_policy_versions (
 id uuid primary key default gen_random_uuid(), target_type text not null, target_id text not null, rule jsonb not null, valid_from timestamptz not null default now(), valid_to timestamptz
);
create index zf_policy_target_idx on public.zf_policy_versions(target_type,target_id);
create table public.zf_audit (
 id uuid primary key default gen_random_uuid(), actor_id text not null references public.zf_users(id), entity text not null, entity_id text not null,
 before_json jsonb, after_json jsonb not null, created_at timestamptz not null default now()
);
create index zf_audit_actor_idx on public.zf_audit(actor_id);
create index zf_audit_entity_idx on public.zf_audit(entity,entity_id,created_at);
-- No browser/Data API role receives direct record access. The authenticated
-- Sites server calls a separately authenticated Edge Function; only its built-in
-- service credential can execute these RPCs. Business authorization is enforced below.
do $$ declare t text; begin foreach t in array array['zf_domains','zf_users','zf_sites','zf_stores','zf_assignments','zf_visits','zf_actions','zf_policy_versions','zf_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update on public.%I to service_role',t);
 end loop; end; $$;
create function public.zf_can_target(actor public.zf_users,typ text,target text) returns boolean
language sql stable security invoker set search_path='' as $$
 select actor.active=1 and exists(select 1 from public.zf_sites s left join public.zf_stores st on st.site_id=s.id and typ='store' and st.id=target
 where ((typ='site' and s.id=target) or (typ='store' and st.id=target)) and
 (actor.role in ('admin','director') or (cardinality(actor.domains)=0 or s.domain=any(actor.domains)) and actor.team=s.team and (actor.role='lead' or actor.part=s.part and
 (actor.role='partlead' or exists(select 1 from public.zf_assignments a where a.user_id=actor.id and a.end_date is null and a.target_type=typ and a.site_id=s.id and coalesce(a.store_id,a.site_id)=target)))))
$$;
create function public.zf_read(p_subject text,p_email text,p_from date default null,p_to date default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor public.zf_users; result jsonb; begin
 if length(p_subject)<1 or p_subject is null or p_email is null then raise exception 'AUTH'; end if;
 select * into actor from public.zf_users where subject=p_subject and active=1;
 if not found then
  update public.zf_users set subject=p_subject where subject is null and email=lower(trim(p_email)) and active=1 returning * into actor;
 end if;
 if actor.id is null then raise exception 'DENIED'; end if;
 select jsonb_build_object('me',to_jsonb(actor)-'subject','domains',coalesce((select jsonb_agg(d.data order by d.name) from public.zf_domains d),'[]'::jsonb),'users',coalesce((select jsonb_agg(case when actor.role='admin' or u.id=actor.id then to_jsonb(u)-'subject' else (to_jsonb(u)-'subject')||jsonb_build_object('email','') end) from public.zf_users u where actor.role in ('admin','director') or u.team=actor.team and(actor.role='lead' or u.part=actor.part)), '[]'::jsonb),
 'sites',coalesce((select jsonb_agg(s.data) from public.zf_sites s where public.zf_can_target(actor,'site',s.id) or exists(select 1 from public.zf_stores st where st.site_id=s.id and public.zf_can_target(actor,'store',st.id))), '[]'::jsonb),
 'stores',coalesce((select jsonb_agg(st.data) from public.zf_stores st where public.zf_can_target(actor,'store',st.id)), '[]'::jsonb),
 'visits',coalesce((select jsonb_agg(v.data) from public.zf_visits v where (p_from is null or coalesce(v.data->>'actualDate',v.data->>'plannedDate')::date between p_from and p_to) and public.zf_can_target(actor,v.target_type,coalesce(v.store_id,v.site_id))), '[]'::jsonb),
 'actions',coalesce((select jsonb_agg(a.data) from public.zf_actions a where (p_from is null or a.state<>'완료' or coalesce(a.data->>'completedDate',a.data->>'createdDate',a.data->>'dueDate')::date between p_from and p_to) and public.zf_can_target(actor,a.target_type,coalesce(a.store_id,a.site_id))), '[]'::jsonb),
 'audit',coalesce((select jsonb_agg(x.row) from (select jsonb_build_object('id',a.id,'actorId',a.actor_id,'entity',a.entity,'entityId',a.entity_id,'before',case when a.before_json is null then null else a.before_json::text end,'after',a.after_json::text,'createdAt',a.created_at) as row from public.zf_audit a where actor.role='admin' or a.actor_id=actor.id order by a.created_at desc limit 300) x), '[]'::jsonb)) into result;
 return result; end; $$;
create function public.zf_write(p_subject text,p_email text,p_entity text,p_item jsonb,p_expected integer default null,p_from date default null,p_to date default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare actor public.zf_users; old jsonb; target text; typ text; sid text; stid text; targetdata jsonb; uid text; rule jsonb; stamp date := (now() at time zone 'Asia/Seoul')::date; nextversion integer; rowcount integer; begin
 perform pg_advisory_xact_lock(91720311);
 perform public.zf_read(p_subject,p_email);
 select * into actor from public.zf_users where subject=p_subject and active=1;
 if actor.id is null then raise exception 'DENIED'; end if;
 if actor.role='director' then raise exception 'SCOPE'; end if;
 if p_entity not in ('domain','user','site','store','visit','action') or p_item->>'id' is null then raise exception 'INVALID'; end if;
 if length(p_item::text)>32000 then raise exception 'TOO_LARGE'; end if;
 if p_entity='domain' then
  if actor.role<>'admin' then raise exception 'SCOPE'; end if;
  select data into old from public.zf_domains where id=p_item->>'id' for update;
  if old is not null and (p_expected is null or (old->>'version')::integer<>p_expected) or old is null and p_expected is not null then raise exception 'CONFLICT'; end if;
  nextversion=coalesce((old->>'version')::integer,0)+1; p_item=p_item||jsonb_build_object('version',nextversion,'active',coalesce((p_item->>'active')::integer,1));
  insert into public.zf_domains(id,code,name,active,version,data) values(p_item->>'id',p_item->>'code',p_item->>'name',(p_item->>'active')::integer,nextversion,p_item)
  on conflict(id) do update set code=excluded.code,name=excluded.name,active=excluded.active,version=excluded.version,data=excluded.data;
 elsif p_entity='user' then
  if actor.role<>'admin' then raise exception 'SCOPE'; end if;
  if exists(select 1 from jsonb_array_elements_text(coalesce(p_item->'domains','[]'::jsonb)) d where not exists(select 1 from public.zf_domains z where z.id=d and z.active=1)) then raise exception 'DOMAIN'; end if;
  select to_jsonb(u) into old from public.zf_users u where id=p_item->>'id' for update;
  if old is not null and (p_expected is null or (old->>'version')::integer<>p_expected) then raise exception 'CONFLICT'; end if;
  if p_item->>'id'=actor.id and (p_item->>'role'<>'admin' or (p_item->>'active')::integer<>1) then raise exception 'SELF_ADMIN'; end if;
  nextversion=coalesce((old->>'version')::integer,0)+1;
  insert into public.zf_users(id,email,name,role,team,part,active,version,domains) values(p_item->>'id',lower(trim(p_item->>'email')),p_item->>'name',p_item->>'role',p_item->>'team',p_item->>'part',(p_item->>'active')::integer,nextversion,coalesce(array(select jsonb_array_elements_text(p_item->'domains')),'{}'))
  on conflict(id) do update set email=excluded.email,name=excluded.name,role=excluded.role,team=excluded.team,part=excluded.part,active=excluded.active,version=excluded.version,domains=excluded.domains;
  -- Existing subjects and historical record owners are retained.
  select to_jsonb(u)-'subject' into p_item from public.zf_users u where id=p_item->>'id';
 else
  typ=case when p_entity in ('site','store') then p_entity else p_item->>'targetType' end;
  sid=case when p_entity='site' then p_item->>'id' else p_item->>'siteId' end;
  stid=case when p_entity='store' then p_item->>'id' else nullif(p_item->>'storeId','') end;
  target=case when typ='store' then stid else sid end;
  if p_entity='site' then select data into old from public.zf_sites where id=p_item->>'id' for update;
  elsif p_entity='store' then select data into old from public.zf_stores where id=p_item->>'id' for update;
  elsif p_entity='visit' then select data into old from public.zf_visits where id=p_item->>'id' for update;
  else select data into old from public.zf_actions where id=p_item->>'id' for update; end if;
  if old is not null and (p_expected is null or (old->>'version')::integer<>p_expected) or old is null and p_expected is not null then raise exception 'CONFLICT'; end if;
  if old is not null and p_entity in ('visit','action') and (old->>'targetType'<>typ or old->>'siteId'<>sid or coalesce(old->>'storeId','')<>coalesce(stid,'')) then raise exception 'IMMUTABLE_TARGET'; end if;
  nextversion=coalesce((old->>'version')::integer,0)+1;
  p_item=p_item||jsonb_build_object('version',nextversion);
  if p_entity in ('site','store') then
   if actor.role='manager' then raise exception 'SCOPE'; end if;
   if old is not null and not public.zf_can_target(actor,typ,target) then raise exception 'SCOPE'; end if;
   if p_entity='site' then targetdata=p_item; else select data into targetdata from public.zf_sites where id=sid; if not public.zf_can_target(actor,'site',sid) then raise exception 'SCOPE'; end if; end if;
   if targetdata is null or actor.role='lead' and actor.team<>targetdata->>'team' or actor.role='partlead' and (actor.team<>targetdata->>'team' or actor.part<>targetdata->>'part') then raise exception 'SCOPE'; end if;
   if p_entity='site' and old is not null and (old->>'team'<>p_item->>'team' or old->>'part'<>p_item->>'part') and exists(select 1 from public.zf_stores where site_id=sid) then raise exception 'ORG_TRANSFER'; end if;
   rule=p_item->'rule';
   if rule->>'period' not in ('week','month','manual') or (rule->>'count')::integer<1 or (rule->>'count')::integer>(case when rule->>'period'='week' then 7 else 8 end) then raise exception 'RULE'; end if;
   if old is not null and old->'rule'<>rule and exists(select 1 from public.zf_visits v where v.target_type=typ and coalesce(v.store_id,v.site_id)=target) then raise exception 'POLICY_LOCKED'; end if;
   if p_entity='site' then
    if coalesce(p_item->>'domain','')='' or not exists(select 1 from public.zf_domains d where d.id=p_item->>'domain' and d.active=1) then raise exception 'DOMAIN'; end if;
    if actor.role not in ('admin','director') and not (p_item->>'domain'=any(actor.domains)) then raise exception 'DOMAIN'; end if;
    if old is not null and coalesce(old->>'domain','')<>'' and old->>'domain'<>p_item->>'domain' and exists(select 1 from public.zf_stores where site_id=sid) then raise exception 'ORG_TRANSFER'; end if;
   else p_item=p_item||jsonb_build_object('domain',targetdata->>'domain'); end if;
   p_item=p_item||jsonb_build_object('division',coalesce((select d.name from public.zf_domains d where d.id=p_item->>'domain'),p_item->>'division',''));
   if jsonb_array_length(p_item->'managerIds')<1 then raise exception 'ASSIGNEE'; end if;
   for uid in select jsonb_array_elements_text(p_item->'managerIds') loop
    if not exists(select 1 from public.zf_users u where u.id=uid and u.active=1 and u.team=targetdata->>'team' and u.part=targetdata->>'part' and (cardinality(u.domains)=0 or coalesce(p_item->>'domain','')='' or p_item->>'domain'=any(u.domains))) then raise exception 'ASSIGNEE'; end if;
   end loop;
   p_item=p_item||jsonb_build_object('startDate',coalesce(old->>'startDate',stamp::text));
   if p_entity='site' then insert into public.zf_sites(id,code,team,part,version,domain,data) values(target,p_item->>'code',p_item->>'team',p_item->>'part',nextversion,nullif(p_item->>'domain',''),p_item) on conflict(id) do update set code=excluded.code,team=excluded.team,part=excluded.part,version=excluded.version,domain=excluded.domain,data=excluded.data;
   else
    if old is not null and old->>'siteId'<>sid then raise exception 'IMMUTABLE_TARGET'; end if;
    insert into public.zf_stores values(target,sid,p_item->>'code',nextversion,p_item) on conflict(id) do update set code=excluded.code,version=excluded.version,data=excluded.data;
   end if;
   update public.zf_assignments set end_date=stamp where target_type=typ and coalesce(store_id,site_id)=target and end_date is null and not (p_item->'managerIds' ? user_id);
   for uid in select distinct jsonb_array_elements_text(p_item->'managerIds') loop
    if not exists(select 1 from public.zf_assignments a where a.target_type=typ and coalesce(a.store_id,a.site_id)=target and a.user_id=uid and a.end_date is null) then insert into public.zf_assignments(target_type,site_id,store_id,user_id,start_date) values(typ,sid,case when typ='store' then stid else null end,uid,stamp); end if;
   end loop;
   if old is null or old->'rule'<>rule then update public.zf_policy_versions set valid_to=now() where target_type=typ and target_id=target and valid_to is null; insert into public.zf_policy_versions(target_type,target_id,rule) values(typ,target,rule); end if;
  else
   if typ not in ('site','store') or not public.zf_can_target(actor,typ,target) then raise exception 'SCOPE'; end if;
   if typ='site' then select data into targetdata from public.zf_sites where id=sid; else select data into targetdata from public.zf_stores where id=stid and site_id=sid; end if;
   if targetdata is null then raise exception 'TARGET'; end if;
   uid=case when p_entity='visit' then p_item->>'visitorId' else p_item->>'ownerId' end;
   if actor.role='manager' and (uid<>actor.id or old is not null and coalesce(old->>'visitorId',old->>'ownerId')<>actor.id) then raise exception 'SCOPE'; end if;
   if not (targetdata->'managerIds' ? uid) and (old is null or uid<>coalesce(old->>'visitorId',old->>'ownerId')) then raise exception 'ASSIGNEE'; end if;
   if old is null and targetdata->>'status'<>'운영 중' then raise exception 'INACTIVE_TARGET'; end if;
   if p_entity='visit' then
    if old->>'status' in ('completed','cancelled') and old->>'status'<>p_item->>'status' then raise exception 'IMMUTABLE_STATUS'; end if;
    if p_item->>'status'='completed' and ((p_item->>'actualDate')::date>stamp or length(trim(p_item->>'detail'))<1) then raise exception 'RESULT'; end if;
    insert into public.zf_visits values(p_item->>'id',sid,stid,typ,uid,p_item->>'status',nullif(p_item->>'requirementId',''),nextversion,p_item) on conflict(id) do update set visitor_id=excluded.visitor_id,status=excluded.status,requirement_id=excluded.requirement_id,version=excluded.version,data=excluded.data;
   else
    if nullif(p_item->>'visitId','') is not null and not exists(select 1 from public.zf_visits v where v.id=p_item->>'visitId' and v.target_type=typ and v.site_id=sid and coalesce(v.store_id,'')=coalesce(stid,'')) then raise exception 'RELATED_VISIT'; end if;
    p_item=p_item||jsonb_build_object('createdDate',coalesce(old->>'createdDate',stamp::text),'completedDate',case when p_item->>'state'='완료' then coalesce(old->>'completedDate',stamp::text) else null end);
    insert into public.zf_actions values(p_item->>'id',sid,stid,typ,nullif(p_item->>'visitId',''),uid,p_item->>'state',nextversion,p_item) on conflict(id) do update set visit_id=excluded.visit_id,owner_id=excluded.owner_id,state=excluded.state,version=excluded.version,data=excluded.data;
   end if;
  end if;
 end if;
 insert into public.zf_audit(actor_id,entity,entity_id,before_json,after_json) values(actor.id,p_entity,p_item->>'id',old,p_item);
 return jsonb_build_object('item',p_item,'data',public.zf_read(p_subject,p_email,p_from,p_to));
end; $$;
revoke all on function public.zf_can_target(public.zf_users,text,text) from public,anon,authenticated;
revoke all on function public.zf_read(text,text,date,date) from public,anon,authenticated;
revoke all on function public.zf_write(text,text,text,jsonb,integer,date,date) from public,anon,authenticated;
grant execute on function public.zf_can_target(public.zf_users,text,text),public.zf_read(text,text,date,date),public.zf_write(text,text,text,jsonb,integer,date,date) to service_role;
-- Explicit defense in depth if a later change accidentally grants Data API roles.
do $$ declare t text; begin foreach t in array array['zf_domains','zf_users','zf_sites','zf_stores','zf_assignments','zf_visits','zf_actions','zf_policy_versions','zf_audit'] loop execute format('create policy zf_server_only on public.%I as restrictive for all to anon,authenticated using (false) with check (false)',t); end loop; end; $$;
