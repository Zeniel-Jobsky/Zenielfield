'use client';
import {useEffect,useRef,useState} from 'react';
import type {AiField} from './model';
import {Plus,Mic,Square,ArrowUp,X,Loader2,Camera} from 'lucide-react';
// ChatGPT-style composer: type, speak or attach photos, then send once; the draft fills the form directly. Nothing is saved here.
export type AiDraft={detail:string;result:string;purpose:string;notes:string;extra:{summary:string;category:string[];urgency:string};actions:{type:string;content:string;dueDate:string}[];confidence:string};
const shrink=(file:File)=>new Promise<string>((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const k=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',0.8))};img.onerror=()=>reject(Error('이미지를 읽지 못했습니다.'));img.src=url});
// Browser speech recognition (Chrome, Edge, Android, iOS Safari 14.5+); audio goes to the browser vendor's service, not our server.
type Recognition={lang:string;continuous:boolean;interimResults:boolean;start():void;stop():void;onresult:((e:{resultIndex:number;results:ArrayLike<{isFinal:boolean;0:{transcript:string}}>})=>void)|null;onend:(()=>void)|null;onerror:((e:{error:string})=>void)|null};
const speechApi=()=>typeof window==='undefined'?null:((window as unknown as Record<string,unknown>).SpeechRecognition||(window as unknown as Record<string,unknown>).webkitSpeechRecognition) as (new()=>Recognition)|null;
export type AiPlanDraft={target:string;plannedDate:string;time:string;purpose:string;precheck:string;confidence:string};
export type AiMeta={text:string;imageCount:number;model:string;generatedAt:string};
// Demo mode has no login and no AI key: build an example draft from keywords so the whole flow can be walked. Never used for live data.
const kstDay=(n=0)=>{const d=new Date(Date.now()+9*3600e3);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const has=(t:string,...w:string[])=>w.some(x=>t.includes(x));
export function demoDraft(text:string,mode:'result'|'plan'):AiDraft|AiPlanDraft{const t=text.trim();
 const purpose=has(t,'민원','불만')?'현장 민원·문제 대응':has(t,'채용','충원','결원','투입')?'신규 인력 투입 및 채용':has(t,'면담','근로자')?'근로자 관리 및 면담':has(t,'미팅','고객사','담당자')?'고객사 담당자 미팅':'현장 정기점검';
 if(mode==='plan'){const day=has(t,'모레')?kstDay(2):has(t,'오늘')?kstDay(0):kstDay(1),m=t.match(/(오전|오후)?s*(d{1,2})시/),h=m?(Number(m[2])%12)+(m[1]==='오후'||(!m[1]&&Number(m[2])<8)?12:0):null;
  return {target:t.split(/s/).find(w=>/점|현장|매장/.test(w))||'',plannedDate:day,time:h===null?'':String(h).padStart(2,'0')+':00',purpose,precheck:'',confidence:'low'}}
 const category=[has(t,'결원','충원','인력','직원')&&'인력',has(t,'고장','온도','수리','안전','시설')&&'시설·안전',has(t,'고객사')&&'고객 요청',has(t,'민원','불만')&&'민원'].filter(Boolean) as string[];
 const actions=[has(t,'결원','충원')&&{type:'인력 충원',content:'결원 인력 충원 요청',dueDate:kstDay(7)},has(t,'고장','수리','온도')&&{type:'안전·시설',content:'설비 점검·수리 요청',dueDate:kstDay(7)},has(t,'민원','불만')&&{type:'민원 대응',content:'민원 처리 결과 회신',dueDate:kstDay(3)}].filter(Boolean) as AiDraft['actions'];
 return {detail:t,result:actions.length?'후속 조치 필요':'특이사항 없음',purpose,notes:'',extra:{summary:t.slice(0,80),category:category.length?category:['운영'],urgency:actions.length>1?'높음':actions.length?'보통':'낮음'},actions,confidence:'low'}}
// AI 정리 요청: 기입력 값을 문장으로 묶어 보낸다. 데모는 서버 없이 공백·문장부호만 정리한 예시 제안을 만든다.
export type TidyValues=Record<AiField,string>;
export const tidyText=(t:string)=>{const s=t.replace(/\s+/g,' ').replace(/\s*([.,!?])\s*/g,'$1 ').replace(/([.!?]) (?=[.!?])/g,'$1').trim().replace(/[,\s]+$/,'');return !s||/[.!?]$/.test(s)?s:s+'.'};
export function demoTidy(v:TidyValues):AiDraft{const detail=tidyText(v.detail),notes=tidyText(v.notes),t=detail+' '+notes;const follow=has(t,'요청','수리','충원','결원','민원','고장','필요');
 return {detail,notes,purpose:v.purpose,result:follow?'후속 조치 필요':v.result||'특이사항 없음',extra:{summary:detail.slice(0,80),category:[has(t,'결원','충원','인력')&&'인력',has(t,'고장','수리','온도','안전','시설')&&'시설·안전',has(t,'민원','불만')&&'민원'].filter(Boolean) as string[],urgency:follow?'보통':'낮음'},actions:[],confidence:'low'}}
export async function requestTidy(v:TidyValues,demo:boolean):Promise<{draft:AiDraft;model:string;generatedAt:string}>{
 if(demo)return {draft:demoTidy(v),model:'데모 예시 정리',generatedAt:new Date().toISOString()};
 const text=`방문 목적: ${v.purpose}\n주요 활동 내용: ${v.detail}\n특이사항: ${v.notes||'(없음)'}\n후속 조치 필요 여부: ${v.result}`;
 const r=await fetch('/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,images:[],mode:'tidy'})});const d=await r.json() as {draft:AiDraft;model?:string;generatedAt?:string;error?:string};
 if(!r.ok)throw Error(d.error||'AI 정리에 실패했습니다.');return {draft:d.draft,model:d.model||'',generatedAt:d.generatedAt||new Date().toISOString()}}
export function AiComposer({onDraft,mode='result',demo=false}:{onDraft:(draft:AiDraft,meta:AiMeta)=>void;mode?:'result'|'plan';demo?:boolean}){
 const [text,setText]=useState(''),[interim,setInterim]=useState(''),[images,setImages]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[listening,setListening]=useState(false),rec=useRef<Recognition|null>(null),box=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>()=>rec.current?.stop(),[]);
 useEffect(()=>{const el=box.current;if(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,180)+'px'}},[text,interim]);
 function toggleVoice(){if(listening){rec.current?.stop();return}
  if(!window.isSecureContext){setError('음성 입력은 https 주소에서만 됩니다. 휴대폰 키보드의 마이크를 사용하세요.');return}
  const Api=speechApi();if(!Api){setError('이 브라우저는 음성 입력을 지원하지 않습니다. Chrome이나 휴대폰 키보드의 마이크를 사용하세요.');return}
  const r=new Api();r.lang='ko-KR';r.continuous=true;r.interimResults=true;
  r.onresult=e=>{let done='',live='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)done+=t;else live+=t}if(done.trim())setText(t=>(t.trim()?t.trim()+' ':'')+done.trim());setInterim(live)};
  r.onerror=e=>setError(e.error==='not-allowed'||e.error==='service-not-allowed'?'마이크가 허용되지 않았습니다. 브라우저 사이트 설정에서 마이크를 허용하고, 아이폰은 설정 → Siri에서 받아쓰기를 켜 주세요.':e.error==='no-speech'?'음성이 들리지 않았습니다. 다시 눌러 말해 주세요.':'음성 인식이 중단되었습니다 ('+e.error+').');
  r.onend=()=>{setListening(false);setInterim('')};rec.current=r;setError('');r.start();setListening(true)}
 async function addImages(files:FileList|null){if(!files)return;try{const next=await Promise.all([...files].slice(0,3-images.length).map(shrink));setImages([...images,...next])}catch(e){setError((e as Error).message)}}
 async function send(){if(listening)rec.current?.stop();if(demo){onDraft(demoDraft(text,mode) as AiDraft,{text,imageCount:images.length,model:'데모 예시 초안',generatedAt:new Date().toISOString()});return}setBusy(true);setError('');try{const r=await fetch('/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,images,mode})});const d=await r.json() as {draft:AiDraft;model?:string;generatedAt?:string;error?:string};if(!r.ok)throw Error(d.error||'AI 요약에 실패했습니다.');onDraft(d.draft,{text,imageCount:images.length,model:d.model||'',generatedAt:d.generatedAt||new Date().toISOString()})}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const ready=!busy&&(text.trim().length>0||images.length>0);
 return <div className="ai-composer-wrap wide">
  <div className={'ai-composer'+(listening?' listening':'')}>
   {images.length>0&&<div className="ai-images">{images.map((src,i)=><span key={i}><img src={src} alt={`첨부 ${i+1}`}/><button type="button" aria-label="사진 삭제" onClick={()=>setImages(images.filter((_,j)=>j!==i))}><X size={12}/></button></span>)}</div>}
   <textarea ref={box} rows={1} maxLength={3000} value={listening&&interim?(text?text+' ':'')+interim:text} readOnly={listening} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(ready)send()}}} placeholder={listening?'듣고 있어요… 말을 마치면 ■ 를 누르세요':mode==='plan'?'예: 다음주 화요일 오후 2시 이마트 양재점 정기점검':'방문 내용을 말하거나 적어 주세요. 사진도 함께 올릴 수 있어요.'}/>
   <div className="ai-bar">
    <label className={'ai-icon'+(images.length>=3?' disabled':'')} aria-label="카메라로 촬영" title="카메라로 촬영 (최대 3장)"><Camera size={18}/><input hidden type="file" accept="image/*" capture="environment" disabled={images.length>=3} onChange={e=>{addImages(e.target.files);e.target.value=''}}/></label><label className={'ai-icon'+(images.length>=3?' disabled':'')} aria-label="앨범에서 사진 추가" title="앨범에서 사진 추가 (최대 3장)"><Plus size={18}/><input hidden type="file" accept="image/*" multiple disabled={images.length>=3} onChange={e=>{addImages(e.target.files);e.target.value=''}}/></label>
    <span className="ai-bar-hint">{busy?'AI가 정리하는 중…':listening?'음성 인식 중':'Enter 전송 · Shift+Enter 줄바꿈'}</span>
    <button type="button" className={'ai-icon'+(listening?' rec':'')} aria-label={listening?'음성 입력 끝':'음성 입력'} onClick={toggleVoice} disabled={busy}>{listening?<Square size={14} fill="currentColor"/>:<Mic size={18}/>}</button>
    <button type="button" className="ai-send" aria-label="AI로 작성" onClick={send} disabled={!ready}>{busy?<Loader2 size={18} className="spin"/>:<ArrowUp size={18}/>}</button>
   </div>
  </div>
  {demo&&<p className="form-hint">데모에서는 AI를 부르지 않고 입력한 낱말로 예시 초안을 만듭니다.</p>}
  <p className="form-hint">사진은 요약에만 쓰고 저장하지 않습니다. 얼굴·연락처·서류가 보이지 않게 찍어 주세요.</p>
  {error&&<p className="form-error" role="alert">{error} 직접 입력은 방문 결과 등록에서 할 수 있습니다.</p>}
 </div>
}
