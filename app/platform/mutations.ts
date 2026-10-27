import type {User} from '../lib/model';
import {type PlatformData,type TargetType,type Rule,type AiEntry,targetsOf,targetOf,visibleTargets,requirements,dayShift,entryOf,aiFields,aiCategories,aiUrgencies,aiConfidences} from './model';
const str=(v:unknown,max:number)=>typeof v==='string'?v.slice(0,max):'';
export function aiEntryOf(raw:any):AiEntry{if(!raw||typeof raw!=='object')throw Error('AI 입력 기록이 없습니다. AI 간편 등록에서 다시 작성해 주세요.');const text=str(raw.input?.text,3000),imageCount=Number(raw.input?.imageCount);if(!Number.isInteger(imageCount)||imageCount<0||imageCount>3)throw Error('AI 입력 사진 수를 확인해 주세요.');if(!text.trim()&&!imageCount)throw Error('AI 입력 원문(메모 또는 사진)이 없습니다.');
 const draft=Object.fromEntries(aiFields.map(k=>[k,str(raw.draft?.[k],3500)])) as AiEntry['draft'],edited=Array.isArray(raw.edited)?[...new Set(raw.edited)].filter((k):k is AiEntry['edited'][number]=>aiFields.includes(k as any)):[];
 return{input:{text,imageCount},draft,summary:str(raw.summary,200),category:(Array.isArray(raw.category)?raw.category:[]).filter((c:unknown)=>aiCategories.includes(c as string)),urgency:aiUrgencies.includes(raw.urgency)?raw.urgency:'',confidence:aiConfidences.includes(raw.confidence)?raw.confidence:'',model:str(raw.model,80),generatedAt:str(raw.generatedAt,40),edited}}
export function newId(){return typeof crypto.randomUUID==='function'?crypto.randomUUID():'demo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
export function updateDemo(data:PlatformData,entity:string,values:any,record:any,actor:User,now:string){
 const next=structuredClone(data),id=record?.id||newId();const manager=actor.role==='manager';if(actor.role==='director')throw Error('사업부장은 조회 전용입니다.');
 const validateDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 const targets=targetsOf(data);const allowed=visibleTargets(targets,actor);const can=(targetId:string)=>allowed.some(t=>t.id===targetId);
 let item:any={...values,id,version:(record?.version||0)+1};let array:any[];
 if(entity==='site'||entity==='store'){
  if(manager)throw Error('현장·매장 등록 및 담당자 배정은 관리자 권한입니다.');if(!item.name?.trim()||!item.code?.trim()||!item.address?.trim())throw Error('이름, 코드, 주소를 입력해 주세요.');
  if(record&&!can(record.id))throw Error('담당 조직 범위 밖의 대상입니다.');
  const parent=entity==='store'?data.sites.find(s=>s.id===item.siteId):null;if(entity==='store'&&(!parent||!can(parent.id)))throw Error('소속 현장을 확인해 주세요.');
  const team=parent?.team||item.team,part=parent?.part||item.part;if(entity==='site'&&record&&(team!==record.team||part!==record.part)&&data.stores.some(s=>s.siteId===record.id))throw Error('산하 매장이 있는 현장의 조직 변경은 별도 이관 절차가 필요합니다.');if(actor.role==='lead'&&team!==actor.team||actor.role==='partlead'&&(team!==actor.team||part!==actor.part))throw Error('소속 조직 범위에서만 등록할 수 있습니다.');
  if(!item.managerIds?.length||item.managerIds.some((u:string)=>!data.users.some(x=>x.id===u&&x.active&&x.team===team&&x.part===part)))throw Error('대상과 같은 팀·파트의 담당자를 1명 이상 선택해 주세요.');
  if(!['week','month','manual'].includes(item.rule?.period)||!Number.isInteger(item.rule?.count)||item.rule.count<1||item.rule.count>8||(item.rule.period==='week'&&item.rule.count>7))throw Error('주간 1~7회, 월간 1~8회 범위의 방문 회차를 입력해 주세요.');
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
