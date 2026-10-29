'use client';
import {useEffect,useState} from 'react';
import {Mic,Camera,X} from 'lucide-react';
import {AiMark} from './ai-mark';
// AI 입력 화면의 기기 권한 안내. 진입 때 알림창을 띄우지 않고 현재 상태만 읽는다.
// 허용 안 된 권한만 제니에리가 한 줄로 이유를 말하고, 칩을 누르면 그때 요청(다시 요청)한다. 모두 허용이면 아무것도 그리지 않는다.
// 업무 흐름을 막지 않는다: 허용하지 않아도 직접 입력은 되고, '닫기'로 이 탭에서 숨긴다. 위치는 GPS 기능이 꺼져 있어 묻지 않는다(GPS_ENABLED).
type State='granted'|'denied'|'prompt'|'unsupported';
const kinds={microphone:{label:'마이크',why:'말로 입력하려면',icon:Mic},camera:{label:'카메라',why:'현장 사진을 찍으려면',icon:Camera}} as const;
type Kind=keyof typeof kinds;
const HIDE_KEY='zf-permission-hidden';
async function query(k:Kind):Promise<State>{try{return (await navigator.permissions.query({name:k as PermissionName})).state as State}catch{return 'prompt'}}
async function ask(k:Kind):Promise<State>{
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)return 'unsupported';
 try{const s=await navigator.mediaDevices.getUserMedia(k==='microphone'?{audio:true}:{video:true});s.getTracks().forEach(t=>t.stop());return 'granted'}catch(e){return (e as Error).name==='NotAllowedError'?'denied':'unsupported'}
}
export function Permissions({need=['microphone','camera']}:{need?:Kind[]}){
 const [states,setStates]=useState<Partial<Record<Kind,State>>>({}),[busy,setBusy]=useState<Kind|''>(''),[hidden,setHidden]=useState(true);
 useEffect(()=>{let on=true;try{setHidden(sessionStorage.getItem(HIDE_KEY)==='1')}catch{setHidden(false)}
  Promise.all(need.map(async k=>[k,window.isSecureContext?await query(k):'unsupported'] as const)).then(r=>{if(on)setStates(Object.fromEntries(r))});return()=>{on=false}},[need.join()]);
 // 아직 묻지 않은 권한은 기능을 누를 때 브라우저가 묻는다. 안내는 거부·사용 불가일 때만
 const left=need.filter(k=>states[k]==='denied'||states[k]==='unsupported');
 if(hidden||!left.length)return null;
 async function request(k:Kind){setBusy(k);const s=await ask(k);setStates(v=>({...v,[k]:s}));setBusy('')}
 const hide=()=>{setHidden(true);try{sessionStorage.setItem(HIDE_KEY,'1')}catch{}};
 const denied=left.some(k=>states[k]==='denied');
 return <div className="zf-permission wide" role="note" aria-label="기기 권한 안내">
  <AiMark size={20}/>
  <p>{left.map(k=>kinds[k].why+' '+kinds[k].label).join(', ')} 권한이 필요해요. 없어도 직접 입력은 돼요.{denied&&<small> 거부한 권한은 주소창 자물쇠 → 사이트 설정에서도 바꿀 수 있어요.</small>}</p>
  <span className="zf-permission-actions">{left.map(k=>{const K=kinds[k].icon,st=states[k];return <button key={k} type="button" className="btn small" disabled={busy!==''||st==='unsupported'} onClick={()=>request(k)}><K size={14}/>{st==='unsupported'?kinds[k].label+' 사용 불가':busy===k?'요청 중…':(st==='denied'?'다시 요청 · ':'허용 · ')+kinds[k].label}</button>})}
   <button type="button" className="iconbtn" aria-label="권한 안내 닫기" onClick={hide}><X size={16}/></button></span>
 </div>;
}
