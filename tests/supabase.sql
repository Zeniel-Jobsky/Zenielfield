-- Disposable fixtures, always rolled back. Run only against the dedicated project.
begin;
do $tests$
declare adminid text:=gen_random_uuid()::text; m1 text:=gen_random_uuid()::text; m2 text:=gen_random_uuid()::text; directorid text:=gen_random_uuid()::text;
 s1 text:=gen_random_uuid()::text;s2 text:=gen_random_uuid()::text;st1 text:=gen_random_uuid()::text;st2 text:=gen_random_uuid()::text;
 v1 text:=gen_random_uuid()::text;v2 text:=gen_random_uuid()::text; a1 text:=gen_random_uuid()::text;
 item jsonb; response jsonb; snapshot jsonb; expected boolean; stamp text:=(now() at time zone 'Asia/Seoul')::date::text; n integer:=0;
begin
 insert into public.zf_users(id,subject,email,name,role,team,part) values
 (adminid,'qa-admin','qa-admin@example.test','가상 관리자','admin','팀A','파트1'),
 (m1,'qa-m1','qa-m1@example.test','가상 매니저1','manager','팀A','파트1'),
 (m2,'qa-m2','qa-m2@example.test','가상 매니저2','manager','팀B','파트2'),
 (directorid,'qa-director','qa-director@example.test','가상 사업부장','director','팀A','파트1');
 if (public.zf_read('qa-admin','qa-admin@example.test')->'me'->>'id')<>adminid then raise exception 'read actor'; end if;n:=n+1;
 item=jsonb_build_object('id',s1,'name','가상 현장A','code',s1,'client','가상 고객사','team','팀A','part','파트1','division','사업부','region','서울','address','가상로','managerIds',jsonb_build_array(m1),'rule',jsonb_build_object('period','month','count',2),'status','운영 중');
 response=public.zf_write('qa-admin','qa-admin@example.test','site',item,null);
 if response->'item'->>'version'<>'1' then raise exception 'version';end if;n:=n+1;
 item=item||jsonb_build_object('id',s2,'code',s2,'team','팀B','part','파트2','managerIds',jsonb_build_array(m2));
 perform public.zf_write('qa-admin','qa-admin@example.test','site',item,null);
 item=jsonb_build_object('id',st1,'siteId',s1,'name','가상 매장A','code',st1,'region','서울','address','가상로','managerIds',jsonb_build_array(m1),'rule',jsonb_build_object('period','month','count',1),'status','운영 중');
 perform public.zf_write('qa-admin','qa-admin@example.test','store',item,null);
 item=item||jsonb_build_object('id',st2,'siteId',s2,'code',st2,'managerIds',jsonb_build_array(m2));
 perform public.zf_write('qa-admin','qa-admin@example.test','store',item,null);
 snapshot=public.zf_read('qa-m1','qa-m1@example.test');
 if jsonb_array_length(snapshot->'sites')<>1 or jsonb_array_length(snapshot->'stores')<>1 then raise exception 'org scope';end if;n:=n+1;
 item=jsonb_build_object('id',v1,'siteId',s1,'storeId',null,'targetType','site','visitorId',m1,'plannedDate',stamp,'time','10:00','purpose','정기 점검','precheck','','status','planned','actualDate',null,'actualTime','','detail','','result','','cancelReason','','notes','','requirementId',null);
 response=public.zf_write('qa-m1','qa-m1@example.test','visit',item,null);n:=n+1;
 item=response->'item'||jsonb_build_object('status','completed','actualDate',stamp,'actualTime','10:30','detail','가상 현장 직접 방문','result','후속 조치 필요');
 response=public.zf_write('qa-m1','qa-m1@example.test','visit',item,1);
 if response->'item'->>'version'<>'2' then raise exception 'update version';end if;n:=n+1;
 snapshot=public.zf_read('qa-m1','qa-m1@example.test');
 if jsonb_array_length(snapshot->'visits')<>1 or snapshot->'visits'->0->>'targetType'<>'site' then raise exception 'parent cascaded';end if;n:=n+1;
 begin perform public.zf_write('qa-m1','qa-m1@example.test','visit',item,1);raise exception 'expected conflict';exception when raise_exception then if SQLERRM<>'CONFLICT' then raise;end if;end;n:=n+1;
 begin perform public.zf_write('qa-director','qa-director@example.test','visit',item,null);raise exception 'director wrote';exception when raise_exception then if SQLERRM<>'SCOPE' then raise;end if;end;n:=n+1;
 begin perform public.zf_write('qa-m2','qa-m2@example.test','visit',item,2);raise exception 'foreign write';exception when raise_exception then if SQLERRM<>'SCOPE' then raise;end if;end;n:=n+1;
 item=response->'item'||jsonb_build_object('status','planned');
 begin perform public.zf_write('qa-m1','qa-m1@example.test','visit',item,2);raise exception 'completion reopened';exception when raise_exception then if SQLERRM<>'IMMUTABLE_STATUS' then raise;end if;end;n:=n+1;
 item=jsonb_build_object('id',a1,'siteId',s1,'storeId',null,'targetType','site','visitId',v1,'ownerId',m1,'type','요청','content','가상 조치','state','처리 중','dueDate',stamp);
 response=public.zf_write('qa-m1','qa-m1@example.test','action',item,null);
 if response->'item'->>'createdDate'<>stamp then raise exception 'issue registration date';end if;n:=n+1;
 item=response->'item'||jsonb_build_object('state','완료');response=public.zf_write('qa-m1','qa-m1@example.test','action',item,1);
 if response->'item'->>'completedDate'<>stamp then raise exception 'issue completion date';end if;n:=n+1;
 item=response->'item'||jsonb_build_object('targetType','store','storeId',st1);
 begin perform public.zf_write('qa-m1','qa-m1@example.test','action',item,2);raise exception 'target changed';exception when raise_exception then if SQLERRM<>'IMMUTABLE_TARGET' then raise;end if;end;n:=n+1;
 item=(select data from public.zf_sites where id=s1)||jsonb_build_object('rule',jsonb_build_object('period','week','count',1));
 begin perform public.zf_write('qa-admin','qa-admin@example.test','site',item,1);raise exception 'policy history rewritten';exception when raise_exception then if SQLERRM<>'POLICY_LOCKED' then raise;end if;end;n:=n+1;
 if has_table_privilege('anon','public.zf_sites','SELECT') or has_table_privilege('authenticated','public.zf_sites','UPDATE') then raise exception 'direct table permission';end if;n:=n+1;
 if has_function_privilege('anon','public.zf_write(text,text,text,jsonb,integer)','EXECUTE') then raise exception 'anonymous RPC';end if;n:=n+1;
 if (select count(*) from public.zf_assignments where site_id=s1 and end_date is null)<>2 then raise exception 'assignments';end if;n:=n+1;
 if not exists(select 1 from public.zf_audit where entity_id=v1 and before_json is not null) then raise exception 'missing audit';end if;n:=n+1;
 raise notice 'Passed % Supabase database assertions',n;
end $tests$;
rollback;
select 'Supabase database assertions passed; all fixtures rolled back' as result;
