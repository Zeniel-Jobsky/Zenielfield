'use client';
import {useEffect,useState} from 'react';
import {LocateFixed,Mic,Camera,ShieldCheck,CheckCircle2} from 'lucide-react';
// AI 입력 화면 진입 시 위치·마이크·카메라 권한을 요청한다. 모두 허용되면 한 줄로 접히고, 거부해도 입력은 계속할 수 있다.
type State='granted'|'denied'|'prompt'|'unsupported';
const kinds=[{key:'geolocation',label:'위치',why:'가까운 현장·매장 자동 선택',icon:LocateFixed},{key:'microphone',label:'마이크',why:'말로 입력',icon:Mic},{key:'camera',label:'카메라',why:'현장 사진 첨부',icon:Camera}] as const;
type Kind=typeof kinds[number]['key'];
async function query(k:Kind):Promise<State>{try{return (await navigator.permissions.query({name:k as PermissionName})).state as State}catch{return 'prompt'}}
async function ask(k:Kind):Promise<State>{
 if(!window.isSecureContext)return 'unsupported';
 if(k==='geolocation')return navigator.geolocation?new Promise(res=>navigator.geolocation.getCurrentPosition(()=>res('granted'),e=>res(e.code===1?'denied':'prompt'),{timeout:15000})):'unsupported';
 if(!navigator.mediaDevices?.getUserMedia)return 'unsupported';
 try{const s=await navigator.mediaDevices.getUserMedia(k==='microphone'?{audio:true}:{video:true});s.getTracks().forEach(t=>t.stop());return 'granted'}catch(e){return (e as Error).name==='NotAllowedError'?'denied':'unsupported'}
}
const word={granted:'허용됨',denied:'거부됨',prompt:'확인 필요',unsupported:'사용 불가'} as const;
export function Permissions(){
 const [states,setStates]=useState<Record<Kind,State>>({geolocation:'prompt',microphone:'prompt',camera:'prompt'}),[busy,setBusy]=useState(false),[secure,setSecure]=useState(true);
 async function request(){setBusy(true);const next={...states};for(const {key} of kinds){next[key]=await query(key)==='granted'?'granted':await ask(key);setStates({...next})}setBusy(false)}
 useEffect(()=>{setSecure(window.isSecureContext);request()},[]);
 if(kinds.every(k=>states[k.key]==='granted'))return <div className="permission-ok wide"><CheckCircle2 size={14}/>위치·마이크·카메라 사용 준비됨</div>;
 return <section className="permission-card wide" aria-label="기기 권한 요청"><header><ShieldCheck size={16}/><b>AI 입력에 쓸 기기 권한</b><button type="button" className="btn small" disabled={busy||!secure} onClick={request}>{busy?'요청 중…':'권한 허용하기'}</button></header>
  <ul>{kinds.map(k=><li key={k.key} className={states[k.key]}><k.icon size={15}/><span><b>{k.label}</b><small>{k.why}</small></span><em>{word[states[k.key]]}</em></li>)}</ul>
  <p>{!secure?'https 주소에서만 권한을 요청할 수 있습니다. 직접 선택·입력은 계속할 수 있습니다.':kinds.some(k=>states[k.key]==='denied')?'거부한 권한은 주소창 왼쪽 자물쇠 → 사이트 설정에서 허용할 수 있습니다. 허용하지 않아도 직접 선택·입력은 됩니다.':'브라우저 알림창에서 "허용"을 눌러 주세요. 위치는 저장할 때 방문 기록에만 남깁니다.'}</p>
 </section>
}
