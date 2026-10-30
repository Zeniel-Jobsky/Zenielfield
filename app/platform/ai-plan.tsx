'use client';
import {AiMark} from './ai-mark';
import {useState,type FormEvent} from 'react';
import {Check,MapPin,ClipboardCheck,Sparkles,PenLine} from 'lucide-react';
import {Field} from '../ui';
import {purposes} from '../lib/model';
import {type TargetType,type Target} from './model';
import type {Context} from './context';
import {AiComposer,type AiPlanDraft} from './ai-assist';
import {GeoPick} from './geo';
import {Permissions} from './permissions';
import {MySchedule,ScheduleHints,VisitSuggest} from './my-schedule';
// AI 방문 일정 등록: 말·글로 "언제·어디·무엇"을 받아 계획 초안을 만든다. 저장은 일반 방문계획(planned)과 같다.
export function matchTarget(targets:Target[],hint:string){const q=hint.replace(/\s+/g,'').toLowerCase();if(q.length<2)return undefined;const score=(t:Target)=>{const n=t.name.replace(/\s+/g,'').toLowerCase(),s=t.siteName.replace(/\s+/g,'').toLowerCase();return n===q?100:n.includes(q)||q.includes(n)?60+n.length:s.includes(q)?20:0};return targets.filter(t=>t.status==='운영 중').map(t=>({t,s:score(t)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s)[0]?.t}
export function AiPlanForm({c,modal,error,onSave,onClose}:{c:Context;modal:any;error:string;onSave:(entity:string,values:any,record?:any)=>void;onClose:()=>void}){
 const locked=!!modal.requirementId;
 const [type,setType]=useState<TargetType>(modal.targetType||c.type),[site,setSite]=useState(modal.siteId||c.siteId||''),[store,setStore]=useState(modal.storeId||c.storeId||'');
 const [plan,setPlan]=useState<AiPlanDraft|null>(null),[values,setValues]=useState({plannedDate:modal.date||c.now,time:'',purpose:purposes[0],precheck:''}),[hint,setHint]=useState(''),[pickedDay,setPickedDay]=useState(''),[pickedReq,setPickedReq]=useState<string|null>(null),[seed,setSeed]=useState('');
 const pick=(t:Target)=>{setType(t.type);setSite(t.siteId);setStore(t.storeId||'')};
 const target=c.targets.find(t=>t.id===(type==='store'?store:site)),owners=(target?.managerIds||[]).filter(id=>c.me.role!=='manager'||id===c.me.id),[visitor,setVisitor]=useState(c.me.id),owner=owners.includes(visitor)?visitor:owners[0]||'';
 const parents=c.data.sites.filter(s=>c.targets.some(t=>t.siteId===s.id)),stores=c.data.stores.filter(s=>s.siteId===site&&c.targets.some(t=>t.id===s.id));
 const ready=(!!plan||!!pickedDay)&&!!target&&!!owner&&/^\d{4}-\d{2}-\d{2}$/.test(values.plannedDate);
 // 초안(AI·데모)은 빈칸만 채운다. 사람이 고른 값이 항상 우선: 내 일정에서 고른 날짜, 일정 잡기로 정해진 대상(locked), 이미 고른 대상·목적.
 function draft(d:AiPlanDraft){setPlan(d);const valid=(x:string)=>/^\d{4}-\d{2}-\d{2}$/.test(x);setValues({plannedDate:pickedDay||(valid(d.plannedDate)?d.plannedDate:values.plannedDate),time:/^\d{2}:\d{2}$/.test(d.time)?d.time:values.time,purpose:values.purpose!==purposes[0]?values.purpose:purposes.includes(d.purpose)?d.purpose:purposes[0],precheck:values.precheck||d.precheck});setHint(d.target);const t=!locked&&!target&&matchTarget(c.targets,d.target);if(t)pick(t)}
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!ready)return;onSave('visit',{entry:'manual',...values,targetType:type,siteId:site,storeId:type==='store'?store:null,visitorId:owner,status:'planned',actualDate:null,actualTime:'',detail:'',notes:'',result:'',cancelReason:'',requirementId:modal.requirementId||pickedReq||null})}
 return <form className="record-form ai-form" onSubmit={submit}><div className="form-scroll"><div className="ai-switch"><button type="button" className="textbtn" onClick={()=>c.open('visit',undefined,{...modal,ai:false,manual:true})}><PenLine size={14}/>직접 입력</button></div>
 <fieldset className="form-grid" disabled={!c.editable||c.saving}>
 <Permissions need={['microphone']}/>
 <div className="form-section first wide"><span>00</span>방문할 날 고르기</div>
 {!target&&!locked&&<VisitSuggest c={c} visitor={owner||c.me.id} onPick={pick}/>}
 {target?<ScheduleHints c={c} target={target} visitor={owner||c.me.id} picked={pickedDay} onPick={(d,tm,rid)=>{setPickedDay(d);setPickedReq(rid);setValues(v=>({...v,plannedDate:d,time:tm||v.time}))}}/>
  :<MySchedule c={c} visitor={owner||c.me.id} window={modal.requirementId&&modal.dueDate?{start:c.now,end:modal.dueDate}:null} picked={pickedDay} onPick={d=>{setPickedDay(d);setSeed(`${Number(d.slice(5,7))}월 ${Number(d.slice(8))}일`)}}/>}
 <div className="form-section wide"><span>01</span>말·글로 일정 입력</div>
 <AiComposer mode="plan" seed={seed} demo={c.demo!==false} onDraft={d=>draft(d as unknown as AiPlanDraft)}/>
 <div className="form-section wide"><span>02</span>방문 대상</div>
 <GeoPick auto targets={c.targets} target={target} onPick={locked?undefined:pick} onGeo={()=>{}}/>
 {plan&&hint&&<p className="form-hint wide">들은 대상: <b>{hint}</b>{target?' → '+target.name:' → 일치하는 대상 없음, 직접 선택해 주세요'}</p>}
 <div className="target-type-switch wide" role="group" aria-label="방문 대상 유형"><button type="button" className={type==='site'?'active':''} disabled={locked} onClick={()=>{setType('site');setStore('')}}><MapPin size={16}/>현장 방문</button><button type="button" className={type==='store'?'active':''} disabled={locked} onClick={()=>setType('store')}><ClipboardCheck size={16}/>매장 방문</button></div>
 <Field label={type==='site'?'방문 현장 *':'상위 현장 *'} wide><select required value={site} disabled={locked} onChange={e=>{setSite(e.target.value);setStore('')}}><option value="">현장 선택</option>{parents.map(s=><option key={s.id} value={s.id}>{s.name} · {s.client}</option>)}</select></Field>
 {type==='store'&&<Field label="방문 매장 *" wide><select required value={store} disabled={locked} onChange={e=>setStore(e.target.value)}><option value="">소속 매장 선택</option>{stores.map(s=><option key={s.id} value={s.id}>{s.name} · {s.code}</option>)}</select></Field>}
 {owners.length>1&&<Field label="방문자 *"><select value={owner} onChange={e=>setVisitor(e.target.value)}>{owners.map(id=><option key={id} value={id}>{c.uname(id)}</option>)}</select></Field>}
 {(plan||pickedDay)&&<><div className="form-section wide"><span>03</span>{plan&&<AiMark/>}{plan?'AI 일정 초안 검토':'일정 검토'}</div>
 <Field label="방문 예정일 *"><input type="date" required value={values.plannedDate} onChange={e=>setValues({...values,plannedDate:e.target.value})}/></Field><Field label="예정 시간"><input type="time" value={values.time} onChange={e=>setValues({...values,time:e.target.value})}/></Field>
 <Field label="방문 목적 *" wide><select value={values.purpose} onChange={e=>setValues({...values,purpose:e.target.value})}>{purposes.map(p=><option key={p}>{p}</option>)}</select></Field>
 <Field label="사전 확인사항" wide><textarea rows={2} maxLength={1500} value={values.precheck} onChange={e=>setValues({...values,precheck:e.target.value})}/></Field>
 {plan?.confidence==='low'&&<p className="form-hint wide warn">확신이 낮아요. 날짜와 대상을 꼭 확인해 주세요.</p>}</>}
 </fieldset>{error&&<p className="form-error" role="alert">{error}</p>}<p className="privacy-note">개인정보 및 고객사 민감정보를 입력하지 마세요.</p></div><div className="form-footer"><button type="button" className="btn" onClick={onClose}>취소</button>{c.editable&&<button className="btn primary" type="submit" disabled={c.saving||!ready}><Check size={16}/>{c.saving?'저장 중':'일정 등록'}</button>}</div></form>
}
