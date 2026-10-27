'use client';
import {useState} from 'react';
import {Sparkles,ImagePlus,X,ArrowRight,ArrowLeft,Check} from 'lucide-react';
import {Field} from '../ui';
import {purposes} from '../lib/model';
// Step-by-step AI draft for a visit: input → review → follow-ups → apply to the form. Nothing is saved here.
export type AiDraft={detail:string;result:string;purpose:string;notes:string;extra:{summary:string;category:string[];urgency:string};actions:{type:string;content:string;dueDate:string}[];confidence:string};
const shrink=(file:File)=>new Promise<string>((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const k=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',0.8))};img.onerror=()=>reject(Error('이미지를 읽지 못했습니다.'));img.src=url});
export function AiAssist({onApply}:{onApply:(draft:AiDraft)=>void}){
 const [open,setOpen]=useState(false),[step,setStep]=useState(1),[text,setText]=useState(''),[images,setImages]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[draft,setDraft]=useState<AiDraft|null>(null),[picked,setPicked]=useState<boolean[]>([]);
 if(!open)return <button type="button" className="btn ai-start wide" onClick={()=>setOpen(true)}><Sparkles size={16}/>AI로 간편 입력 · 메모나 사진으로 자동 작성</button>;
 async function addImages(files:FileList|null){if(!files)return;try{const next=await Promise.all([...files].slice(0,3-images.length).map(shrink));setImages([...images,...next])}catch(e){setError((e as Error).message)}}
 async function analyze(){setBusy(true);setError('');try{const r=await fetch('/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,images})});const d=await r.json() as {draft:AiDraft;error?:string};if(!r.ok)throw Error(d.error||'AI 요약에 실패했습니다.');setDraft(d.draft);setPicked(d.draft.actions.map(()=>true));setStep(2)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const edit=(patch:Partial<AiDraft>)=>setDraft({...draft!,...patch});
 function apply(){const actions=draft!.actions.filter((_,i)=>picked[i]);onApply({...draft!,actions,result:actions.length?'후속 조치 필요':draft!.result});setOpen(false);setStep(1)}
 return <div className="ai-assist wide"><div className="ai-head"><Sparkles size={16}/><b>AI 간편 입력</b><span>{step}/3 · {['메모·사진','내용 확인','후속 조치'][step-1]}</span><button type="button" className="icon-btn" aria-label="닫기" onClick={()=>setOpen(false)}><X size={16}/></button></div>
 {step===1&&<><Field label="방문 메모" wide><textarea rows={4} maxLength={3000} value={text} onChange={e=>setText(e.target.value)} placeholder="예: 강남점 방문. 계산대 인력 2명 부족, 점장님이 다음주까지 충원 요청."/></Field>
  <div className="ai-images">{images.map((src,i)=><span key={i}><img src={src} alt={`첨부 ${i+1}`}/><button type="button" aria-label="사진 삭제" onClick={()=>setImages(images.filter((_,j)=>j!==i))}><X size={12}/></button></span>)}{images.length<3&&<label className="btn"><ImagePlus size={16}/>사진 추가<input hidden type="file" accept="image/*" capture="environment" multiple onChange={e=>{addImages(e.target.files);e.target.value=''}}/></label>}</div>
  <p className="form-hint">사진은 요약에만 쓰고 저장하지 않습니다. 얼굴·연락처·서류가 보이지 않게 찍어 주세요.</p>
  <div className="ai-nav"><span/><button type="button" className="btn primary" disabled={busy||(!text.trim()&&!images.length)} onClick={analyze}>{busy?'AI 분석 중…':<>다음<ArrowRight size={16}/></>}</button></div></>}
 {step===2&&draft&&<><p className="ai-summary">{draft.extra.summary||'요약 없음'} · 긴급도 {draft.extra.urgency}{draft.extra.category.length?' · '+draft.extra.category.join(', '):''}{draft.confidence==='low'?' · 확신 낮음, 꼭 확인하세요':''}</p>
  <Field label="방문 목적" wide><select value={draft.purpose} onChange={e=>edit({purpose:e.target.value})}>{purposes.map(p=><option key={p}>{p}</option>)}</select></Field>
  <Field label="주요 활동 내용" wide><textarea rows={4} value={draft.detail} onChange={e=>edit({detail:e.target.value})}/></Field>
  <Field label="특이사항" wide><textarea rows={2} value={draft.notes} onChange={e=>edit({notes:e.target.value})}/></Field>
  <div className="ai-nav"><button type="button" className="btn" onClick={()=>setStep(1)}><ArrowLeft size={16}/>이전</button><button type="button" className="btn primary" onClick={()=>setStep(3)}>다음<ArrowRight size={16}/></button></div></>}
 {step===3&&draft&&<>{draft.actions.length?draft.actions.map((a,i)=><label key={i} className="checkbox wide"><input type="checkbox" checked={picked[i]} onChange={e=>setPicked(picked.map((p,j)=>j===i?e.target.checked:p))}/>{a.type} · {a.content} · 기한 {a.dueDate}</label>):<p className="form-hint">AI가 제안한 후속 조치가 없습니다.</p>}
  <p className="form-hint">체크한 첫 조치는 방문 저장 후 조치 입력 화면에 미리 채워집니다.</p>
  <div className="ai-nav"><button type="button" className="btn" onClick={()=>setStep(2)}><ArrowLeft size={16}/>이전</button><button type="button" className="btn primary" onClick={apply}><Check size={16}/>폼에 적용</button></div></>}
 {error&&<p className="form-error" role="alert">{error} 직접 입력해도 됩니다.</p>}</div>
}
