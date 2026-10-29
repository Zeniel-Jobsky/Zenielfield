'use client';
import {kstDay} from '../lib/date';
import {useEffect,useRef,useState} from 'react';
import type {AiField} from './model';
import {collapseRepeats} from '../lib/dedupe-text';
import {Plus,Mic,Square,ArrowUp,X,Loader2,Camera,FileText} from 'lucide-react';
// ChatGPT-style composer: type, speak or attach photos, then send once; the draft fills the form directly. Nothing is saved here.
export type AiUnclear={field:'purpose'|'detail'|'notes'|'result'|'actions';what:string;where:string;options:string[]};
export type AiDraft={detail:string;result:string;purpose:string;notes:string;extra:{summary:string};actions:{type:string;content:string;dueDate:string}[];unclear?:AiUnclear[];meeting?:AiMeeting;confidence:string};
export type AiMeeting={isMeeting:boolean;topic:string;target:string;date:string;start:string;end:string;attendeeCount:number;items:string[];extra:string[]};
// 회의록 양식: 입력칸에 넣어 채우거나, 종이에 같은 순서로 써서 사진으로 올린다
export const MEETING_TEMPLATE=`1. 미팅 주제: 
2. 방문 현장·매장: 
3. 참석 인원: 
4. 일시: 
5. 논의 내용: 
6. 추가 사항: `;
const shrink=(file:File)=>new Promise<string>((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const k=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',0.8))};img.onerror=()=>reject(Error('이미지를 읽지 못했습니다.'));img.src=url});
// Browser speech recognition (Chrome, Edge, Android, iOS Safari 14.5+); audio goes to the browser vendor's service, not our server.
type Recognition={lang:string;continuous:boolean;interimResults:boolean;start():void;stop():void;onresult:((e:{resultIndex:number;results:ArrayLike<{isFinal:boolean;0:{transcript:string}}>})=>void)|null;onend:(()=>void)|null;onerror:((e:{error:string})=>void)|null};
const speechApi=()=>typeof window==='undefined'?null:((window as unknown as Record<string,unknown>).SpeechRecognition||(window as unknown as Record<string,unknown>).webkitSpeechRecognition) as (new()=>Recognition)|null;
export type AiPlanDraft={target:string;plannedDate:string;time:string;purpose:string;precheck:string;confidence:string};
export type AiMeta={text:string;imageCount:number;model:string;generatedAt:string};
// AI 없이 만드는 초안(데모·AI 연결 안 됨): 입력 원문을 그대로 옮기기만 한다. 목적·결과·조치·분류를 낱말로 추정하지 않는다(DC-JUDGMENT). 사람이 고른다.
export function demoDraft(text:string,mode:'result'|'plan'):AiDraft|AiPlanDraft{const t=text.trim();
 if(mode==='plan'){const md=t.match(/(\d{1,2})월\s*(\d{1,2})일/),y=kstDay(0).slice(0,4),day=md?`${y}-${md[1].padStart(2,'0')}-${md[2].padStart(2,'0')}`:t.includes('모레')?kstDay(2):t.includes('오늘')?kstDay(0):kstDay(1),m=t.match(/(오전|오후)?\s*(\d{1,2})시/),h=m?(Number(m[2])%12)+(m[1]==='오후'||(!m[1]&&Number(m[2])<8)?12:0):null;
  return {target:t.split(/\s/).find(w=>/점|현장|매장/.test(w))||'',plannedDate:day,time:h===null?'':String(h).padStart(2,'0')+':00',purpose:'',precheck:'',confidence:'low'}}
 return {detail:t,result:'',purpose:'',notes:'',extra:{summary:t.slice(0,80)},actions:[],confidence:'low'}}
// AI 정리 요청: 기입력 값을 문장으로 묶어 보낸다. 데모는 서버 없이 공백·문장부호만 정리한 예시 제안을 만든다.
export type TidyValues=Record<AiField,string>;
// AI 연결 상태: 크레딧 소진·키 없음 같은 운영 설정 문제는 한 번 확인되면 10분 동안 다시 부르지 않고 간단 정리로 대신한다.
// 사용자가 누를 때마다 같은 오류("관리자 문의")를 보지 않게 하기 위함이다. 이 브라우저 탭에만 기억한다.
const DOWN_KEY='zf-ai-down';
export function aiDownReason():string{try{const v=JSON.parse(sessionStorage.getItem(DOWN_KEY)||'null');return v&&v.until>Date.now()?v.reason:''}catch{return ''}}
function markAiDown(reason:string){try{sessionStorage.setItem(DOWN_KEY,JSON.stringify({reason,until:Date.now()+10*60*1000}))}catch{}}
const clip=(m:string)=>{let s=m.split(' 직접 입력해 주세요')[0].trim();while(s.endsWith('.'))s=s.slice(0,-1).trim();return s};
export async function callAssist(body:unknown):Promise<{draft:any;model:string;generatedAt:string}>{
 const r=await fetch('/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json() as {draft:any;model?:string;generatedAt?:string;error?:string};
 if(!r.ok){const msg=clip(d.error||'AI 응답 오류');if(r.status===502||r.status===503)markAiDown(msg);throw Error(msg)}
 return {draft:d.draft,model:d.model||'',generatedAt:d.generatedAt||new Date().toISOString()}}
export const tidyText=(t:string)=>{const s=t.replace(/\s+/g,' ').replace(/\s*([.,!?])\s*/g,'$1 ').replace(/([.!?]) (?=[.!?])/g,'$1').trim().replace(/[,\s]+$/,'');return !s||/[.!?]$/.test(s)?s:s+'.'};
export function demoTidy(v:TidyValues):AiDraft{const detail=tidyText(collapseRepeats(v.detail)),notes=tidyText(collapseRepeats(v.notes));
 return {detail,notes,purpose:v.purpose,result:v.result,extra:{summary:detail.slice(0,80)},actions:[],confidence:'low'}}
export async function requestTidy(v:TidyValues,demo:boolean):Promise<{draft:AiDraft;model:string;generatedAt:string}>{
 if(demo)return {draft:demoTidy(v),model:'데모 예시 정리',generatedAt:new Date().toISOString()};
 const down=aiDownReason();if(down)return {draft:demoTidy(v),model:`간단 정리 · AI 연결 안 됨(${down})`,generatedAt:new Date().toISOString()};
 const text=`방문 목적: ${v.purpose}\n주요 활동 내용: ${v.detail}\n특이사항: ${v.notes||'(없음)'}\n후속 조치 필요 여부: ${v.result}`;
 try{return await callAssist({text,images:[],mode:'tidy'})}catch(e){return {draft:demoTidy(v),model:`간단 정리 · AI 연결 안 됨(${(e as Error).message})`,generatedAt:new Date().toISOString()}}}
// seed: 바깥에서 고른 값(예: 내 일정에서 고른 날짜)을 입력 앞에 넣는다. 값이 바뀔 때마다 앞부분을 바꾼다.
export function AiComposer({onDraft,mode='result',demo=false,seed=''}:{onDraft:(draft:AiDraft,meta:AiMeta)=>void;mode?:'result'|'plan';demo?:boolean;seed?:string}){
 const [text,setText]=useState(''),[interim,setInterim]=useState(''),[images,setImages]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState(''),[listening,setListening]=useState(false),rec=useRef<Recognition|null>(null),box=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>()=>rec.current?.stop(),[]);
 const lastSeed=useRef('');useEffect(()=>{if(!seed)return;setText(t=>{const rest=lastSeed.current&&t.startsWith(lastSeed.current)?t.slice(lastSeed.current.length):t;lastSeed.current=seed+' ';return seed+' '+rest.trimStart()});box.current?.focus()},[seed]);
 useEffect(()=>{const el=box.current;if(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,180)+'px'}},[text,interim]);
 function toggleVoice(){if(listening){rec.current?.stop();return}
  if(!window.isSecureContext){setError('음성 입력은 https 주소에서만 됩니다. 휴대폰 키보드의 마이크를 사용하세요.');return}
  const Api=speechApi();if(!Api){setError('이 브라우저는 음성 입력을 지원하지 않습니다. Chrome이나 휴대폰 키보드의 마이크를 사용하세요.');return}
  const r=new Api();r.lang='ko-KR';r.continuous=true;r.interimResults=true;
  // 결과를 이어 붙이지 않고 매번 전체 결과 목록으로 다시 만든다. 브라우저(특히 안드로이드 Chrome)가 이미 확정된 결과를 다시 보내거나,
  // 새 확정 결과에 앞 문장을 포함해 보내면 이어 붙이기 방식에서는 같은 말이 반복된다. 앞 결과를 포함하는 결과는 앞 결과를 대신한다.
  const base=text.trim();
  r.onresult=e=>{const finals:string[]=[];let live='';
   for(let i=0;i<e.results.length;i++){const t=e.results[i][0].transcript.trim();if(!t)continue;
    if(!e.results[i].isFinal){live=t;continue}
    const last=finals[finals.length-1];
    if(last&&t.startsWith(last))finals[finals.length-1]=t;else if(last&&last.endsWith(t))continue;else finals.push(t)}
   const spoken=finals.join(' ');setText((base?base+' ':'')+spoken);
   setInterim(live&&!spoken.endsWith(live)?live:'')};
  r.onerror=e=>setError(e.error==='not-allowed'||e.error==='service-not-allowed'?'마이크가 허용되지 않았습니다. 브라우저 사이트 설정에서 마이크를 허용하고, 아이폰은 설정 → Siri에서 받아쓰기를 켜 주세요.':e.error==='no-speech'?'음성이 들리지 않았습니다. 다시 눌러 말해 주세요.':'음성 인식이 중단되었습니다 ('+e.error+').');
  r.onend=()=>{setListening(false);setInterim('')};rec.current=r;setError('');r.start();setListening(true)}
 async function addImages(files:FileList|null){if(!files)return;try{const next=await Promise.all([...files].slice(0,3-images.length).map(shrink));setImages([...images,...next])}catch(e){setError((e as Error).message)}}
 async function send(){if(listening)rec.current?.stop();const clean=collapseRepeats(text);if(clean!==text)setText(clean);const text0=clean;if(demo){onDraft(demoDraft(text0,mode) as AiDraft,{text:text0,imageCount:images.length,model:'데모 예시 초안',generatedAt:new Date().toISOString()});return}setBusy(true);setError('');setNote('');const fallback=(why:string)=>{setNote(`AI 연결이 안 돼(${why}) 입력한 내용을 그대로 옮겼습니다. 목적·결과를 직접 골라 주세요.`);onDraft(demoDraft(text0,mode) as AiDraft,{text:text0,imageCount:images.length,model:`간단 정리 · AI 연결 안 됨(${why})`,generatedAt:new Date().toISOString()})};
  const down=aiDownReason();if(down){fallback(down);setBusy(false);return}
  try{const d=await callAssist({text:text0,images,mode});onDraft(d.draft,{text:text0,imageCount:images.length,model:d.model,generatedAt:d.generatedAt})}catch(e){fallback((e as Error).message)}finally{setBusy(false)}}
 const ready=!busy&&(text.trim().length>0||images.length>0);
 return <div className="ai-composer-wrap wide">
  <div className={'ai-composer'+(listening?' listening':'')}>
   {images.length>0&&<div className="ai-images">{images.map((src,i)=><span key={i}><img src={src} alt={`첨부 ${i+1}`}/><button type="button" aria-label="사진 삭제" onClick={()=>setImages(images.filter((_,j)=>j!==i))}><X size={14}/></button></span>)}</div>}
   <textarea ref={box} rows={1} maxLength={3000} value={listening&&interim?(text?text+' ':'')+interim:text} readOnly={listening} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(ready)send()}}} placeholder={listening?'듣고 있어요… 말을 마치면 ■ 를 누르세요':mode==='plan'?'예: 다음주 화요일 오후 2시 이마트 양재점 정기점검':'방문 내용을 말하거나 적어 주세요. 사진도 함께 올릴 수 있어요.'}/>
   <div className="ai-bar">
    <label className={'ai-icon'+(images.length>=3?' disabled':'')} aria-label="카메라로 촬영" title="카메라로 촬영 (최대 3장)"><Camera size={20}/><input hidden type="file" accept="image/*" capture="environment" disabled={images.length>=3} onChange={e=>{addImages(e.target.files);e.target.value=''}}/></label><label className={'ai-icon'+(images.length>=3?' disabled':'')} aria-label="앨범에서 사진 추가" title="앨범에서 사진 추가 (최대 3장)"><Plus size={20}/><input hidden type="file" accept="image/*" multiple disabled={images.length>=3} onChange={e=>{addImages(e.target.files);e.target.value=''}}/></label>
    {mode==='result'&&<button type="button" className="ai-icon" aria-label="회의록 양식 넣기" title="회의록 양식 넣기" disabled={busy||listening} onClick={()=>{setText(t=>t.trim()?t.trimEnd()+'\n'+MEETING_TEMPLATE:MEETING_TEMPLATE);box.current?.focus()}}><FileText size={20}/></button>}<span className="ai-bar-hint">{busy?'AI가 정리하는 중…':listening?'음성 인식 중':'Enter 전송 · Shift+Enter 줄바꿈'}</span>
    <button type="button" className={'ai-icon'+(listening?' rec':'')} aria-label={listening?'음성 입력 끝':'음성 입력'} onClick={toggleVoice} disabled={busy}>{listening?<Square size={14} fill="currentColor"/>:<Mic size={20}/>}</button>
    <button type="button" className="ai-send" aria-label="AI로 작성" onClick={send} disabled={!ready}>{busy?<Loader2 size={20} className="spin"/>:<ArrowUp size={20}/>}</button>
   </div>
  </div>
  {demo&&<p className="form-hint">데모에서는 AI를 부르지 않고 입력한 내용을 그대로 옮깁니다. 목적·결과는 직접 골라 주세요.</p>}
  <p className="form-hint">사진은 요약에만 쓰고 저장하지 않습니다. 얼굴·연락처·서류가 보이지 않게 찍어 주세요.</p>
  {note&&<p className="form-hint ai-fallback-note" role="status">{note}</p>}
  {error&&<p className="form-error" role="alert">{error} 직접 입력은 방문 결과 등록에서 할 수 있습니다.</p>}
 </div>
}
