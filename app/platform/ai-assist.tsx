'use client';
import {useEffect,useRef,useState} from 'react';
import {Plus,Mic,Square,ArrowUp,X,Loader2} from 'lucide-react';
// ChatGPT-style composer: type, speak or attach photos, then send once; the draft fills the form directly. Nothing is saved here.
export type AiDraft={detail:string;result:string;purpose:string;notes:string;extra:{summary:string;category:string[];urgency:string};actions:{type:string;content:string;dueDate:string}[];confidence:string};
const shrink=(file:File)=>new Promise<string>((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const k=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',0.8))};img.onerror=()=>reject(Error('이미지를 읽지 못했습니다.'));img.src=url});
// Browser speech recognition (Chrome, Edge, Android, iOS Safari 14.5+); audio goes to the browser vendor's service, not our server.
type Recognition={lang:string;continuous:boolean;interimResults:boolean;start():void;stop():void;onresult:((e:{resultIndex:number;results:ArrayLike<{isFinal:boolean;0:{transcript:string}}>})=>void)|null;onend:(()=>void)|null;onerror:((e:{error:string})=>void)|null};
const speechApi=()=>typeof window==='undefined'?null:((window as unknown as Record<string,unknown>).SpeechRecognition||(window as unknown as Record<string,unknown>).webkitSpeechRecognition) as (new()=>Recognition)|null;
export type AiMeta={text:string;imageCount:number;model:string;generatedAt:string};
export function AiComposer({onDraft}:{onDraft:(draft:AiDraft,meta:AiMeta)=>void}){
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
 async function send(){if(listening)rec.current?.stop();setBusy(true);setError('');try{const r=await fetch('/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,images})});const d=await r.json() as {draft:AiDraft;model?:string;generatedAt?:string;error?:string};if(!r.ok)throw Error(d.error||'AI 요약에 실패했습니다.');onDraft(d.draft,{text,imageCount:images.length,model:d.model||'',generatedAt:d.generatedAt||new Date().toISOString()})}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const ready=!busy&&(text.trim().length>0||images.length>0);
 return <div className="ai-composer-wrap wide">
  <div className={'ai-composer'+(listening?' listening':'')}>
   {images.length>0&&<div className="ai-images">{images.map((src,i)=><span key={i}><img src={src} alt={`첨부 ${i+1}`}/><button type="button" aria-label="사진 삭제" onClick={()=>setImages(images.filter((_,j)=>j!==i))}><X size={12}/></button></span>)}</div>}
   <textarea ref={box} rows={1} maxLength={3000} value={listening&&interim?(text?text+' ':'')+interim:text} readOnly={listening} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(ready)send()}}} placeholder={listening?'듣고 있어요… 말을 마치면 ■ 를 누르세요':'방문 내용을 말하거나 적어 주세요. 사진도 함께 올릴 수 있어요.'}/>
   <div className="ai-bar">
    <label className={'ai-icon'+(images.length>=3?' disabled':'')} aria-label="사진 추가" title="사진 추가 (최대 3장)"><Plus size={18}/><input hidden type="file" accept="image/*" multiple disabled={images.length>=3} onChange={e=>{addImages(e.target.files);e.target.value=''}}/></label>
    <span className="ai-bar-hint">{busy?'AI가 정리하는 중…':listening?'음성 인식 중':'Enter 전송 · Shift+Enter 줄바꿈'}</span>
    <button type="button" className={'ai-icon'+(listening?' rec':'')} aria-label={listening?'음성 입력 끝':'음성 입력'} onClick={toggleVoice} disabled={busy}>{listening?<Square size={14} fill="currentColor"/>:<Mic size={18}/>}</button>
    <button type="button" className="ai-send" aria-label="AI로 작성" onClick={send} disabled={!ready}>{busy?<Loader2 size={18} className="spin"/>:<ArrowUp size={18}/>}</button>
   </div>
  </div>
  <p className="form-hint">사진은 요약에만 쓰고 저장하지 않습니다. 얼굴·연락처·서류가 보이지 않게 찍어 주세요.</p>
  {error&&<p className="form-error" role="alert">{error} 직접 입력은 방문 결과 등록에서 할 수 있습니다.</p>}
 </div>
}
