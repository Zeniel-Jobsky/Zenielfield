'use client';
// 설정 화면: 탭 한 줄(내 계정 · 사용자·권한 · 관리 도메인 · 브리핑 내용). 모든 직급이 프로필 메뉴 `설정`으로 들어오고, 관리 탭은 시스템 관리자·사업부장에게만 보인다.
// 내 계정 = 프로필·비밀번호 정하기·화면 옵션(제니에리 움직임). 개인 옵션은 이 브라우저에만 저장한다.
import {useEffect,useState,type FormEvent} from 'react';
import {UserRound,UsersRound,Layers,Newspaper,KeyRound,Sparkles} from 'lucide-react';
import {roles} from '../lib/model';
import type {Context} from './context';
import {PlatformUsers,PlatformDomains,type SaveMany} from './users';
import {AiBriefSettings} from './ai-brief';

// 제니에리 움직임(통통·작성 중 움직임) 끄기: html.zf-calm 이면 CSS가 움직임을 멈춘다. 기기 움직임 줄이기 설정도 따로 따른다.
const CALM='zf-calm';
export function readCalm(){try{return localStorage.getItem(CALM)==='1'}catch{return false}}
export function applyCalm(v=readCalm()){document.documentElement.classList.toggle(CALM,v);try{localStorage.setItem(CALM,v?'1':'0')}catch{}}

type Tab='me'|'users'|'domains'|'brief';
export function SettingsPage({c,live,onSave,onSaveMany}:{c:Context;live:boolean;onSave:(entity:string,v:any,r?:any)=>void;onSaveMany:SaveMany}){
 const manage=['admin','director'].includes(c.me.role);
 const tabs:[Tab,string,typeof UserRound][]=[['me','내 계정',UserRound],...(manage?[['users','사용자·권한',UsersRound],['domains','관리 도메인',Layers]] as [Tab,string,typeof UserRound][]:[]),['brief','브리핑 내용',Newspaper]];
 const [tab,setTab]=useState<Tab>(manage?'users':'me');
 return <div className="settings">
  <div className="settings-tabs" role="tablist" aria-label="설정 구분">{tabs.map(([k,label,Icon])=><button key={k} type="button" role="tab" id={'set-tab-'+k} aria-controls={'set-panel-'+k} aria-selected={tab===k} className={tab===k?'on':''} onClick={()=>setTab(k)}><Icon size={16} aria-hidden/>{label}</button>)}</div>
  <div role="tabpanel" id={'set-panel-'+tab} aria-labelledby={'set-tab-'+tab}>
   {tab==='me'&&<MyAccount c={c} live={live}/>}
   {tab==='users'&&<PlatformUsers c={c} onSaveMany={onSaveMany}/>}
   {tab==='domains'&&<PlatformDomains c={c} onSave={onSave}/>}
   {tab==='brief'&&<AiBriefSettings c={c}/>}
  </div>
 </div>;
}

function MyAccount({c,live}:{c:Context;live:boolean}){
 const me=c.data.users.find(u=>u.id===c.me.id);
 const [calm,setCalm]=useState(false);useEffect(()=>setCalm(readCalm()),[]);
 return <div className="settings-me">
  <section className="panel settings-block"><div className="panel-heading"><h2>프로필</h2></div>
   <dl className="settings-dl"><div><dt>이름</dt><dd>{c.me.name}</dd></div><div><dt>로그인 메일</dt><dd>{me?.email||'-'}</dd></div><div><dt>역할</dt><dd>{roles[c.me.role]}</dd></div><div><dt>소속</dt><dd>{c.me.team} / {c.me.part}</dd></div></dl>
   <p className="settings-note">이름·소속·역할은 시스템 관리자가 바꿔요.</p>
  </section>
  <section className="panel settings-block"><div className="panel-heading"><h2><KeyRound size={18} aria-hidden/>로그인 비밀번호</h2></div>
   {live?<MyPassword/>:<p className="settings-note">데모에서는 비밀번호를 정하지 않아요. 운영 계정으로 로그인하면 여기서 정할 수 있어요.</p>}
  </section>
  <section className="panel settings-block"><div className="panel-heading"><h2><Sparkles size={18} aria-hidden/>화면</h2></div>
   <label className="settings-switch"><span><b>제니에리 움직임</b><small>정리·브리핑 머리의 제니에리가 가끔 통통 튀어요. 끄면 이 브라우저에서 멈춰요.</small></span><input type="checkbox" role="switch" checked={!calm} onChange={e=>{const v=!e.target.checked;setCalm(v);applyCalm(v)}}/></label>
  </section>
 </div>;
}

// 본인 비밀번호 정하기: 이메일 링크로 처음 로그인한 직원이 다음부터 비밀번호로 들어올 수 있게 한다. 서버는 로그인한 본인 메일에만 쓴다.
function MyPassword(){
 const [pw,setPw]=useState(''),[pw2,setPw2]=useState(''),[msg,setMsg]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setErr('');setMsg('');if(pw.length<8||pw.length>72)return setErr('8자 이상 72자 이하로 정해 주세요.');if(pw!==pw2)return setErr('두 칸의 비밀번호가 달라요.');
  setBusy(true);try{const r=await fetch('/api/auth/my-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});const d=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw Error(d.error||'비밀번호를 정하지 못했어요.');setMsg('비밀번호를 정했어요. 다음부터 메일과 이 비밀번호로 로그인할 수 있어요.');setPw('');setPw2('')}catch(x){setErr(x instanceof Error?x.message:String(x))}finally{setBusy(false)}}
 return <form className="settings-form" onSubmit={submit}>
  <p className="settings-note">처음에는 메일로 받은 링크로 로그인해요. 비밀번호를 정해 두면 다음부터 링크 없이 바로 들어올 수 있어요.</p>
  <label>새 비밀번호<input type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={pw} onChange={e=>setPw(e.target.value)}/></label>
  <label>한 번 더<input type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={pw2} onChange={e=>setPw2(e.target.value)}/></label>
  {err&&<p className="form-error" role="alert">{err}</p>}{msg&&<p className="form-ok" role="status">{msg}</p>}
  <div><button type="submit" className="btn primary" disabled={busy}>{busy?'저장 중':'비밀번호 저장'}</button></div>
 </form>;
}
