'use client';
import {useEffect,useState} from 'react';
import {RefreshCw,X} from 'lucide-react';
// 새 버전 알림: 서버의 /version.json 을 5분마다·탭으로 돌아올 때 읽어 이 화면의 빌드(__ZF_BUILD__)와 버전·커밋이 다르면 알린다.
// 커밋 뒤 "+수정" 표기는 비교에서 뺀다(개발 중 파일 수정마다 알림이 뜨지 않게).
type Info={version:string;commit:string;at:string;dev:boolean};
const base=(c:string)=>c.split('+')[0];
const same=(a:Info,b:Info)=>a.version===b.version&&base(a.commit)===base(b.commit);
export function UpdateNotice(){
 const [next,setNext]=useState<Info|null>(null),[hidden,setHidden]=useState('');
 useEffect(()=>{let alive=true;
  const check=async()=>{try{const r=await fetch('/version.json',{cache:'no-store'});if(!r.ok)return;const v=await r.json() as Info;if(alive&&v?.version)setNext(same(v,__ZF_BUILD__)?null:v)}catch{}};
  check();const t=setInterval(check,5*60*1000),onVis=()=>{if(document.visibilityState==='visible')check()};document.addEventListener('visibilitychange',onVis);
  return()=>{alive=false;clearInterval(t);document.removeEventListener('visibilitychange',onVis)}},[]);
 if(!next||hidden===next.version+next.commit)return null;
 return <div className="update-notice" role="status">
  <span><b>새 버전이 있습니다</b> v{next.version} · {base(next.commit)} <small>지금 화면 v{__ZF_BUILD__.version} · {base(__ZF_BUILD__.commit)}</small></span>
  {next.dev?<small className="update-hint">개발 서버는 <code>npm restart</code> 후 새로고침하세요.</small>:<button type="button" className="btn small primary" onClick={()=>window.location.reload()}><RefreshCw size={14}/>새로고침</button>}
  <button type="button" className="iconbtn" aria-label="알림 닫기" onClick={()=>setHidden(next.version+next.commit)}><X size={14}/></button>
 </div>;
}
