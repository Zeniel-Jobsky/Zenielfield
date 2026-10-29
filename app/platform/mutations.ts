import type {User} from '../lib/model';
import {type PlatformData,type TargetType,type Rule,type AiEntry,targetsOf,targetOf,visibleTargets,requirements,dayShift,entryOf,validGeo,distanceM,managesDomain,domainName,aiFields,type AiField,aiConfidences,MANUAL_REASONS} from './model';
import {cleanJudgment} from './judgment';
const str=(v:unknown,max:number)=>typeof v==='string'?v.slice(0,max):'';
export function aiEntryOf(raw:any):AiEntry{if(!raw||typeof raw!=='object')throw Error('AI 입력 기록이 없습니다. AI 간편 등록에서 다시 작성해 주세요.');const text=str(raw.input?.text,3000),imageCount=Number(raw.input?.imageCount);if(!Number.isInteger(imageCount)||imageCount<0||imageCount>3)throw Error('AI 입력 사진 수를 확인해 주세요.');if(!text.trim()&&!imageCount)throw Error('AI 입력 원문(메모 또는 사진)이 없습니다.');
 const draft=Object.fromEntries(aiFields.map(k=>[k,str(raw.draft?.[k],3500)])) as AiEntry['draft'],edited=Array.isArray(raw.edited)?[...new Set(raw.edited)].filter((k):k is AiEntry['edited'][number]=>aiFields.includes(k as any)):[];
 return{input:{text,imageCount},draft,summary:str(raw.summary,200),confidence:aiConfidences.includes(raw.confidence)?raw.confidence:'',model:str(raw.model,80),generatedAt:str(raw.generatedAt,40),edited}}
export function newId(){return typeof crypto.randomUUID==='function'?crypto.randomUUID():'demo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
export function updateDemo(data:PlatformData,entity:string,values:any,record:any,actor:User,now:string){
 const next=structuredClone(data),id=record?.id||newId();const manager=actor.role==='manager';if(actor.role==='director')throw Error('사업부장은 조회 전용입니다.');
 const validateDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 const targets=targetsOf(data);const allowed=visibleTargets(targets,actor);const can=(targetId:string)=>allowed.some(t=>t.id===targetId);
 let item:any={...values,id,version:(record?.version||0)+1};let array:any[];
 if(entity==='domain'){
  if(actor.role!=='admin')throw Error('관리 도메인 등록은 시스템 관리자 권한입니다.');const code=String(item.code||'').trim().toUpperCase(),name=String(item.name||'').trim();if(!/^[A-Z0-9_-]{2,20}$/.test(code)||!name)throw Error('도메인 코드(영문·숫자 2–20자)와 이름을 입력해 주세요.');
  if(next.domains.some(d=>d.id!==id&&d.code===code))throw Error('이미 사용 중인 도메인 코드입니다.');item={id,code,name,active:Number(item.active??1)?1:0,version:item.version};array=next.domains;
 }else if(entity==='user'){
  if(actor.role!=='admin')throw Error('사용자 등록은 시스템 관리자 권한입니다.');if(!item.name?.trim()||!/^[^@\s]+@[^@\s]+$/.test(item.email||'')||!item.team?.trim()||!item.part?.trim())throw Error('이름, 이메일, 팀, 파트를 입력해 주세요.');
  const domains=[...new Set((Array.isArray(item.domains)?item.domains:[]).filter((d:unknown):d is string=>typeof d==='string'))];if(domains.some(d=>!next.domains.some(x=>x.id===d&&x.active)))throw Error('활성 관리 도메인만 지정할 수 있습니다.');
  if(record?.id===actor.id&&(item.role!=='admin'||Number(item.active)!==1))throw Error('본인의 관리자 권한은 해제할 수 없습니다.');
  if(record&&(record.active&&!Number(item.active)||record.team!==String(item.team).trim()||record.part!==String(item.part).trim())){const open=[...data.sites,...data.stores].filter(t=>t.managerIds.includes(record.id)).length;if(open)throw Error(`담당 중인 현장·매장 ${open}곳을 먼저 다른 담당자에게 배정해 주세요.`)}
  item={id,email:String(item.email).trim().toLowerCase(),name:item.name.trim(),role:item.role,team:item.team.trim(),part:item.part.trim(),active:Number(item.active)?1:0,domains,version:item.version};array=next.users;
 }else if(entity==='site'||entity==='store'){
  if(manager)throw Error('현장·매장 등록 및 담당자 배정은 관리자 권한입니다.');if(!item.name?.trim()||!item.code?.trim()||!item.address?.trim())throw Error('이름, 코드, 주소를 입력해 주세요.');
  if(record&&!can(record.id))throw Error('담당 조직 범위 밖의 대상입니다.');
  if(item.lat==null&&item.lng==null||item.lat===''&&item.lng===''){item.lat=null;item.lng=null}else{const g={lat:Number(item.lat),lng:Number(item.lng)};if(!validGeo(g))throw Error('위도·경도를 확인해 주세요.');item.lat=g.lat;item.lng=g.lng}
  const parent=entity==='store'?data.sites.find(s=>s.id===item.siteId):null;if(entity==='store'&&(!parent||!can(parent.id)))throw Error('소속 현장을 확인해 주세요.');
  const domain=entity==='store'?parent!.domain||'':String(item.domain||record?.domain||'');if(entity==='site'){if(!domain||!next.domains.some(d=>d.id===domain&&d.active))throw Error('활성 관리 도메인을 선택해 주세요.');if(!managesDomain(actor,domain))throw Error('본인이 관리하는 도메인에만 등록할 수 있습니다.');if(record&&record.domain&&record.domain!==domain&&data.stores.some(s=>s.siteId===record.id))throw Error('산하 매장이 있는 현장의 도메인 변경은 별도 이관 절차가 필요합니다.')}item.domain=domain||undefined;item.division=domainName(next,domain)||item.division||'';
  const team=parent?.team||item.team,part=parent?.part||item.part;for(const uid of (item.managerIds||[]) as string[]){const u=data.users.find(x=>x.id===uid);if(u&&domain&&(u.domains||[]).length&&!u.domains!.includes(domain))throw Error(`${u.name}은(는) 이 도메인을 관리하지 않습니다.`)}if(entity==='site'&&record&&(team!==record.team||part!==record.part)&&data.stores.some(s=>s.siteId===record.id))throw Error('산하 매장이 있는 현장의 조직 변경은 별도 이관 절차가 필요합니다.');if(actor.role==='lead'&&team!==actor.team||actor.role==='partlead'&&(team!==actor.team||part!==actor.part))throw Error('소속 조직 범위에서만 등록할 수 있습니다.');
  if(!item.managerIds?.length||item.managerIds.some((u:string)=>!data.users.some(x=>x.id===u&&x.active&&x.team===team&&x.part===part)))throw Error('대상과 같은 팀·파트의 담당자를 1명 이상 선택해 주세요.');
  if(!['week','month','manual'].includes(item.rule?.period)||!Number.isInteger(item.rule?.count)||item.rule.count<1||item.rule.count>8||(item.rule.period==='week'&&item.rule.count>7))throw Error('주간 1~7회, 월간 1~8회 범위의 방문 회차를 입력해 주세요.');
  // 필요 시는 근거가 있어야 한다(서버 저장 함수와 같은 규칙). 지정·변경은 팀장 이상, 지정자·지정일·재검토일은 여기서 붙인다.
  if(item.rule.period==='manual'){const m=item.manual,old=record?.manual;
   if(!m?.reason&&record&&record.rule?.period==='manual'&&!old)delete item.manual;
   else if(!MANUAL_REASONS.includes(m?.reason)||m.reason==='기타'&&!String(m.note||'').trim())throw Error('필요 시로 두려면 근거를 선택해 주세요(기타는 설명 필수).');
   else if(!old||record.rule?.period!=='manual'||old.reason!==m.reason||(old.note||'')!==String(m.note||'').trim()){if(!['admin','lead'].includes(actor.role))throw Error('필요 시 지정·변경은 팀장 이상 권한입니다.');item.manual={reason:m.reason,note:String(m.note||'').trim().slice(0,200),by:actor.id,at:now,review:dayShift(now,90)}}
   else item.manual=old}else delete item.manual;
  array=entity==='site'?next.sites:next.stores;if(array.some(t=>t.code===item.code&&t.id!==id))throw Error('이미 사용 중인 코드입니다.');
  if(entity==='site')item={...item,client:item.client||'가상 고객사',division:item.division||'유통사업부',cycle:item.rule.period==='week'?'weekly':item.rule.period==='manual'?'manual':'monthly'};
  item.startDate=record?.startDate||now;
 }else if(entity==='visit'||entity==='action'){
  if(!['site','store'].includes(item.targetType))throw Error('현장 방문 또는 매장 방문을 선택해 주세요.');
  const target=targets.find(t=>t.id===(item.targetType==='store'?item.storeId:item.siteId));if(!target||target.siteId!==item.siteId||!can(target.id))throw Error('접근할 수 있는 현장·매장을 선택해 주세요.');
  item.storeId=item.targetType==='store'?item.storeId:null;
  if(record&&targetOf(record)!==target.id)throw Error('기존 기록의 방문 대상은 변경할 수 없습니다.');
  const owner=entity==='visit'?item.visitorId:item.ownerId;if(!target.managerIds.includes(owner)&&owner!==(record?(entity==='visit'?record.visitorId:record.ownerId):null))throw Error('해당 현장·매장에 배정된 담당자를 선택해 주세요.');if(manager&&(owner!==actor.id||(record&&(entity==='visit'?record.visitorId:record.ownerId)!==actor.id)))throw Error('본인의 방문·조치만 등록하거나 수정할 수 있습니다.');
  if(entity==='visit'){
   if(!['planned','completed','cancelled'].includes(item.status)||!item.purpose)throw Error('방문 목적과 진행 상태를 확인해 주세요.');
   if(record?.status==='completed'&&item.status!=='completed'||record?.status==='cancelled'&&item.status!=='cancelled')throw Error('완료·취소 기록의 상태는 되돌릴 수 없습니다. 새 방문을 등록해 주세요.');
   if(item.plannedDate&&!validateDate(item.plannedDate))throw Error('유효한 예정일을 입력해 주세요.');if(item.status==='planned'&&!item.plannedDate)throw Error('방문 예정일을 입력해 주세요.');
   if(item.status==='completed'&&(!validateDate(item.actualDate)||item.actualDate>now||!item.detail?.trim()))throw Error('오늘까지의 실제 방문일과 주요 활동 내용을 입력해 주세요.');
   if(item.status==='cancelled'&&!item.cancelReason?.trim())throw Error('취소 사유를 입력해 주세요.');
   if(item.requirementId){
    if(!item.requirementId.startsWith('req:'+target.id+':'))throw Error('필요 회차와 방문 대상이 일치하지 않습니다.');
    const unit=item.requirementId.slice(('req:'+target.id+':').length).slice(0,10);const req=requirements([target],unit,dayShift(unit,40)).find(r=>r.id===item.requirementId);
    if(!record&&!req)throw Error('존재하는 필요 회차를 선택해 주세요.');
    if(req&&item.status==='planned'&&item.plannedDate&&(item.plannedDate<req.windowStart||item.plannedDate>req.windowEnd))throw Error('해당 필요 회차의 인정 기간 안으로 방문 예정일을 정해 주세요.');
    if(req&&item.status==='completed'&&item.actualDate<req.windowStart)throw Error('필요 회차 시작일 이전의 방문을 연결할 수 없습니다.');
   }
   if(item.requirementId&&next.visits.some(v=>v.id!==id&&v.requirementId===item.requirementId&&v.status!=='cancelled'))throw Error('이 필요 회차에는 이미 계획 또는 결과가 연결되어 있습니다. 기존 일정을 수정해 주세요.');
   const done=record?.status==='completed',entry=done?entryOf(record):entryOf(item);if(done&&entryOf(item)!==entry)throw Error('AI 등록과 직접 입력 기록은 서로 바꿀 수 없습니다.');delete item.extra;delete item.aiAssisted;delete item.aiFields;
   if(entry==='ai'){if(item.status!=='completed')throw Error('AI 간편 등록은 방문 결과로만 저장합니다.');item.entry='ai';item.ai=aiEntryOf(item.ai);item.ai.edited=aiFields.filter(k=>(item[k]||'')!==item.ai.draft[k])}else{item.entry='manual';delete item.ai}
   // AI 정리: 제안(aiEdit)을 서버가 기록으로 바꾼다. 반영된 칸 = 저장값이 제안과 같고 이전값과 다른 칸. 기록 목록은 서버 보관본만 쓴다.
   const priorEdits=Array.isArray(record?.aiEdits)?record.aiEdits:[];const prop=item.aiEdit;delete item.aiEdit;item.aiEdits=priorEdits;
   if(prop!=null){if(item.status!=='completed'||typeof prop!=='object'||typeof prop.proposed!=='object'||prop.proposed===null)throw Error('AI 정리는 방문 결과에만 반영할 수 있습니다.');
    const str=(x:unknown)=>typeof x==='string'?x.slice(0,3500):'';const base:Record<string,string>=record?.status==='completed'?record:(typeof prop.before==='object'&&prop.before)||{};
    const before=Object.fromEntries(aiFields.map(k=>[k,str(base[k])])) as Record<AiField,string>,proposed=Object.fromEntries(aiFields.map(k=>[k,str(prop.proposed[k])])) as Record<AiField,string>;
    const applied=aiFields.filter(k=>(item[k]||'')===proposed[k]&&proposed[k]!==before[k]);
    if(applied.length)item.aiEdits=[...priorEdits.slice(-9),{model:str(prop.model).slice(0,80),generatedAt:str(prop.generatedAt).slice(0,40),appliedAt:new Date().toISOString(),byId:actor.id,before,proposed,applied}];}
   if(!item.aiEdits.length)delete item.aiEdits;
   // 종합 판정: 방문 결과에만. 보내지 않으면 내용(목적·상세·특이사항·결과·방문일)이 그대로일 때만 기존 판정 유지, 바뀌었으면 지워 미판정으로. 사람이 확인해 저장하면 확정자·시각을 서버가 붙인다.
   if(item.status!=='completed')delete item.judgment;else if(item.judgment===undefined){const same=!!record&&(['purpose','detail','notes','result','actualDate'] as const).every(k=>(record[k]||'')===(item[k]||''));if(same&&record?.judgment)item.judgment=record.judgment;else delete item.judgment}else if(item.judgment===null)delete item.judgment;else{const j=cleanJudgment(item.judgment);if(!j)delete item.judgment;else{if(j.by!=='ai'){j.confirmedBy=actor.id;j.at=new Date().toISOString()}item.judgment=j}}
   if(item.geo==null)delete item.geo;else{const g=item.geo as {lat:number;lng:number},acc=Number(item.geo.accuracy);if(!validGeo(g)||!Number.isFinite(acc)||acc<0)throw Error('GPS 위치 기록을 확인해 주세요.');item.geo={lat:g.lat,lng:g.lng,accuracy:Math.round(acc),at:typeof item.geo.at==='string'?item.geo.at.slice(0,40):'',distance:target.lat!==null&&target.lng!==null?distanceM(g,{lat:target.lat,lng:target.lng}):null}}
   if(item.status!=='completed'){item.actualDate=null;item.actualTime='';item.detail='';item.notes='';item.result=''}
   array=next.visits;
  }else{
   if(!item.content?.trim()||!validateDate(item.dueDate)||!['조치 예정','처리 중','보류','완료'].includes(item.state))throw Error('조치 내용, 유효한 기한 및 상태를 입력해 주세요.');
   if(item.visitId&&!data.visits.some(v=>v.id===item.visitId&&targetOf(v)===target.id))throw Error('관련 방문기록과 대상이 일치하지 않습니다.');
   item.completedDate=item.state==='완료'?(record?.completedDate||now):null;item.createdDate=record?.createdDate||now;array=next.actions;
  }
 }else throw Error('지원하지 않는 등록입니다.');
 const index=array.findIndex(x=>x.id===id);if(index<0)array.push(item);else array[index]=item;
 next.audit.push({id:newId(),actorId:actor.id,entity,entityId:id,before:record?JSON.stringify(record):null,after:JSON.stringify(item),createdAt:new Date().toISOString()});
 return {data:next,item};
}
