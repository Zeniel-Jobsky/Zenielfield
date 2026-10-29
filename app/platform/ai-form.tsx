'use client';
import {AiMark} from './ai-mark';
import {daysBetween} from '../lib/date';
import {JudgeCheck,runJudge,judgeKey,confirmed,type JudgeState} from './judge-check';
import {useState,type FormEvent} from 'react';
import {Check,MapPin,ClipboardCheck,Sparkles,Info,RotateCcw,PenLine} from 'lucide-react';
import {Field} from '../ui';
import {purposes} from '../lib/model';
import {type TargetType,type AiEntry,type AiField,aiFields,targetOf,typeName,requirements,dayShift} from './model';
import type {Context} from './context';
import {AiComposer,type AiDraft} from './ai-assist';
import {GeoPick} from './geo';
import {Permissions} from './permissions';
import type {VisitGeo,Target,FieldVisit} from './model';
// AI 간편 등록 전용 화면: 대상 선택 → 말·글·사진 → AI 초안 검토 → 저장. 직접 입력 칸은 두지 않는다.
const labels:Record<AiField,string>={purpose:'방문 목적',detail:'주요 활동 내용',notes:'특이사항',result:'후속 조치 필요 여부'};
export function AiVisitForm({c,modal,error,onSave,onClose}:{c:Context;modal:any;error:string;onSave:(entity:string,values:any,record?:any)=>void;onClose:()=>void}){
 const r=modal.record,saved:AiEntry|undefined=r?.entry==='ai'?r.ai:undefined,locked=!!r||!!modal.requirementId;
 const [type,setType]=useState<TargetType>(r?.targetType||modal.targetType||c.type),[site,setSite]=useState(r?.siteId||modal.siteId||c.siteId||''),[store,setStore]=useState(r?.storeId||modal.storeId||c.storeId||'');
 const [ai,setAi]=useState<AiEntry|null>(saved||null),[values,setValues]=useState<Record<AiField,string>>(()=>Object.fromEntries(aiFields.map(k=>[k,r?.[k]||''])) as Record<AiField,string>),[actions,setActions]=useState<AiDraft['actions']>([]),[picked,setPicked]=useState<boolean[]>([]),[judge,setJudge]=useState<JudgeState|null>(null),[judging,setJudging]=useState(false);
 const [geo,setGeo]=useState<VisitGeo|null>(null),pick=(t:Target)=>{setType(t.type);setSite(t.siteId);setStore(t.storeId||'')};
 const [actualDate,setActualDate]=useState(r?.actualDate||c.now),[actualTime,setActualTime]=useState(()=>r?.actualTime||new Date().toTimeString().slice(0,5)),[linkId,setLinkId]=useState<string|null>(null);
 const target=c.targets.find(t=>t.id===(type==='store'?store:site)),owners=(target?.managerIds||[]).filter(id=>c.me.role!=='manager'||id===c.me.id),[visitor,setVisitor]=useState(r?.visitorId||c.me.id),owner=r?.visitorId||(owners.includes(visitor)?visitor:owners[0]||'');
 const parents=c.data.sites.filter(s=>c.targets.some(t=>t.siteId===s.id)),stores=c.data.stores.filter(s=>s.siteId===site&&c.targets.some(t=>t.id===s.id));
 const plans=c.data.visits.filter(v=>v.status==='planned'&&c.targets.some(t=>t.id===targetOf(v))&&(c.me.role!=='manager'||v.visitorId===c.me.id)).sort((a,b)=>(a.plannedDate||'').localeCompare(b.plannedDate||'')).slice(0,200);
 const canEdit=c.editable&&(c.me.role!=='manager'||!r||r.visitorId===c.me.id),ready=!!ai&&!!target&&!!owner&&!!values.detail.trim();
 // 대상이 정해지면 그 대상의 미완료 계획 중 오늘 연결할 수 있는 것(필요 회차 인정 기간이 시작됨)을 자동 연결한다. 지난·오늘 계획 우선, 그다음 가까운 예정.
 const linkable=(v:FieldVisit)=>{if(!v.requirementId||!target)return true;const head=('req:'+target.id+':').length,unit=v.requirementId.slice(head,head+10),req=requirements([target],unit,dayShift(unit,40)).find(q=>q.id===v.requirementId);return !req||req.windowStart<=actualDate};
 const rank=(v:FieldVisit)=>{const d=daysBetween(c.now,v.plannedDate||c.now);return d<=0?-d:100+d};
 const near=(v:{plannedDate:string|null})=>!!v.plannedDate&&Math.abs(daysBetween(c.now,v.plannedDate))<=14,candidates=target?plans.filter(v=>targetOf(v)===target.id&&near(v)&&linkable(v)).sort((a,b)=>rank(a)-rank(b)):[],linked=r||!candidates.length?null:candidates.find(v=>v.id===(linkId??candidates[0].id))||null;
 function draft(d:AiDraft,meta:{text:string;imageCount:number;model:string;generatedAt:string}){const v={purpose:purposes.includes(d.purpose)?d.purpose:'',detail:d.detail,notes:d.notes,result:['후속 조치 필요','특이사항 없음'].includes(d.result)?d.result:''};setValues(v);setActions(d.actions);setPicked(d.actions.map(()=>true));setAi({input:{text:meta.text,imageCount:meta.imageCount},draft:v,summary:d.extra.summary,confidence:d.confidence,model:meta.model,generatedAt:meta.generatedAt,edited:[]})}
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!ready||!ai||!target)return;const base=r||linked;
  // 종합 판정: 직접 입력과 같은 기준. 내용이 판정 때와 다르면 먼저 판정해 보여 주고 저장은 다음 클릭에서.
  const pending=actions.filter((_,i)=>picked[i]),rep={purpose:values.purpose,detail:values.detail,notes:values.notes,result:values.result,actualDate};
  if(judge?.key!==judgeKey(rep)){if(!judging){setJudging(true);runJudge(c,target.id,r?.id||null,rep,pending).then(setJudge).finally(()=>setJudging(false))}return}
 onSave('visit',{...(base||{}),entry:'ai',ai,...values,targetType:type,siteId:site,storeId:type==='store'?store:null,visitorId:base?.visitorId||owner,status:'completed',plannedDate:base?.plannedDate||null,time:base?.time||'',precheck:base?.precheck||'',actualDate,actualTime,geo:geo||r?.geo||null,cancelReason:'',requirementId:base?.requirementId||modal.requirementId||null,aiActions:pending,judgment:confirmed(judge)},base||undefined)}
 const edited=(k:AiField)=>!!ai&&values[k]!==ai.draft[k];
 return <form className="record-form ai-form" onSubmit={submit}><div className="form-scroll"><div className="notice slim ai-notice"><Sparkles size={16}/><span><b>AI 입력</b> 말·글·사진으로 쓰면 AI가 결과를 정리합니다. 검토 후 저장하세요.</span>{!saved&&<button type="button" className="textbtn" onClick={()=>c.open('visit',r,{...modal,ai:false,manual:true,result:true})}><PenLine size={14}/>직접 입력</button>}</div>
 <fieldset className="form-grid" disabled={!canEdit||c.saving}>
 {!saved&&<Permissions/>}
 <div className="form-section first wide"><span>01</span>말·글·사진으로 입력</div>
 {!saved&&<AiComposer onDraft={draft} demo={c.demo!==false}/>}
 <div className="form-section wide"><span>02</span>방문 대상</div>
 <GeoPick auto={!saved} targets={c.targets} target={target} onPick={locked?undefined:pick} onGeo={setGeo}/>
 {!r&&target&&(candidates.length?<p className="form-hint wide link-hint"><span>계획 연결</span><b>{linked?`${linked.plannedDate} ${linked.time||''} 예정`.replace(/s+예정$/,' 예정'):'계획 외 방문'}</b>{candidates.length>1&&<select value={linkId??candidates[0].id} onChange={e=>setLinkId(e.target.value)}>{candidates.map(v=><option key={v.id} value={v.id}>{v.plannedDate} {v.time}</option>)}<option value="none">계획 외 방문으로 저장</option></select>}{candidates.length===1&&<button type="button" className="textbtn" onClick={()=>setLinkId(linkId==='none'?null:'none')}>{linkId==='none'?'계획에 연결':'계획 외로 저장'}</button>}</p>:<p className="form-hint wide">이 대상에 오늘 기준 ±14일 안의 미완료 계획이 없어 계획 외 방문으로 저장됩니다.</p>)}
 <div className="target-type-switch wide" role="group" aria-label="방문 대상 유형"><button type="button" className={type==='site'?'active':''} disabled={locked} onClick={()=>{setType('site');setStore('')}}><MapPin size={16}/>현장 방문</button><button type="button" className={type==='store'?'active':''} disabled={locked} onClick={()=>setType('store')}><ClipboardCheck size={16}/>매장 방문</button></div>
 <Field label={type==='site'?'방문 현장 *':'상위 현장 *'} wide><select required value={site} disabled={locked} onChange={e=>{setSite(e.target.value);setStore('')}}><option value="">현장 선택</option>{parents.map(s=><option key={s.id} value={s.id}>{s.name} · {s.client}</option>)}</select></Field>
 {type==='store'&&<Field label="방문 매장 *" wide><select required value={store} disabled={locked} onChange={e=>setStore(e.target.value)}><option value="">소속 매장 선택</option>{stores.map(s=><option key={s.id} value={s.id}>{s.name} · {s.code}</option>)}</select></Field>}
 {owners.length>1&&!r&&<Field label="방문자 *"><select value={owner} onChange={e=>setVisitor(e.target.value)}>{owners.map(id=><option key={id} value={id}>{c.uname(id)}</option>)}</select></Field>}
 {ai&&<><div className="form-section wide"><span>03</span><AiMark/>AI 초안 검토</div>
 <div className="ai-result wide"><p><Sparkles size={14}/><b>AI 요약</b> {ai.summary||'요약 없음'}</p><p className="ai-tags">{ai.confidence==='low'&&<span className="warn">확신 낮음 · 꼭 확인</span>}</p>{ai.input.text&&<details><summary>입력 원문</summary><p className="ai-source">{ai.input.text}</p></details>}<p className="form-hint">AI 초안을 고친 칸은 &quot;수정됨&quot;으로 표시되고 그대로 기록됩니다.</p></div>
 <details className="optional-field wide"><summary>방문 일시 {actualDate===c.now?'오늘':actualDate} {actualTime} · 바꾸려면 펼치기</summary><div className="form-grid"><Field label="실제 방문일 *"><input type="date" value={actualDate} max={c.now} required onChange={e=>setActualDate(e.target.value)}/></Field><Field label="실제 방문 시간"><input type="time" value={actualTime} onChange={e=>setActualTime(e.target.value)}/></Field></div></details>
 {aiFields.map(k=><Field key={k} label={labels[k]+(k==='detail'?' *':'')+(edited(k)?' · 수정됨':' · AI')} wide={k!=='purpose'&&k!=='result'}>{k==='purpose'?<select data-ai={edited(k)?undefined:'1'} required value={values[k]} onChange={e=>setValues({...values,[k]:e.target.value})}><option value="" disabled>선택해 주세요</option>{purposes.map(p=><option key={p}>{p}</option>)}</select>:k==='result'?<select data-ai={edited(k)?undefined:'1'} required value={values[k]} onChange={e=>setValues({...values,[k]:e.target.value})}><option value="" disabled>선택해 주세요</option><option>특이사항 없음</option><option>후속 조치 필요</option></select>:<textarea data-ai={edited(k)?undefined:'1'} required={k==='detail'} rows={k==='detail'?4:2} maxLength={k==='detail'?3500:1000} value={values[k]} onChange={e=>setValues({...values,[k]:e.target.value})}/>}</Field>)}
 {edited('detail')||edited('notes')||edited('purpose')||edited('result')?<button type="button" className="textbtn wide" onClick={()=>setValues({...ai.draft})}><RotateCcw size={14}/>AI 초안으로 되돌리기</button>:null}
 {actions.length>0&&<div className="ai-actions wide"><b>제안된 후속 조치</b>{actions.map((a,i)=><label key={i} className="checkbox"><input type="checkbox" checked={!!picked[i]} onChange={e=>setPicked(picked.map((p,j)=>j===i?e.target.checked:p))}/>{a.type} · {a.content} · 기한 {a.dueDate}</label>)}<small>체크한 조치는 저장할 때 바로 등록됩니다.</small></div>}</>}
 {!ai&&<p className="form-hint wide"><Info size={14}/> 메모·음성·사진을 보내면 AI가 방문 결과 초안을 만듭니다. 직접 입력은 방문 결과 등록 화면을 사용하세요.</p>}
 <JudgeCheck state={judge} busy={judging} onLevel={l=>setJudge(j=>j?.judgment?{...j,judgment:{...j.judgment,level:l}}:j)}/>
 </fieldset>{error&&<p className="form-error" role="alert">{error}</p>}<p className="privacy-note">개인정보 및 고객사 민감정보를 입력하지 마세요.</p></div><div className="form-footer"><button type="button" className="btn" onClick={onClose}>{canEdit?'취소':'닫기'}</button>{canEdit&&<button className="btn primary" type="submit" disabled={c.saving||!ready}><Check size={16}/>{c.saving?'저장 중':linked?'계획 방문 완료로 저장':'방문 완료로 저장'}</button>}</div></form>
}
