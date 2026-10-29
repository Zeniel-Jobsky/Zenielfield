'use client';
// 사용자(세션) 메뉴: 오른쪽 위 아바타 하나에 계정 관련 동작을 모은다(일반 앱과 같은 자리).
// 운영: 이름·역할·소속, 데이터 새로고침, 설정, 로그아웃 / 데모: 데모 안내, 설정, 로그인. Esc·바깥 누르기로 닫고 포커스는 버튼으로 돌아간다.
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {ChevronDown,RefreshCw,Settings,LogOut,LogIn} from 'lucide-react';

export function AccountMenu({name,role,org,avatar,live,refreshing,onRefresh,onSettings,onLogout,onLogin}:{name:string;role:string;org:string;avatar:ReactNode;live:boolean;refreshing?:boolean;onRefresh?:()=>void;onSettings:()=>void;onLogout?:()=>void;onLogin?:()=>void}){
 const [open,setOpen]=useState(false),box=useRef<HTMLDivElement>(null),btn=useRef<HTMLButtonElement>(null),id=useId();
 useEffect(()=>{if(!open)return;const out=(e:PointerEvent)=>{if(!box.current?.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);btn.current?.focus()}};
  document.addEventListener('pointerdown',out);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',out);document.removeEventListener('keydown',key)}},[open]);
 const run=(f?:()=>void)=>()=>{setOpen(false);f?.()};
 return <div className="account-menu" ref={box}>
  <button ref={btn} type="button" className="user-menu" aria-haspopup="menu" aria-expanded={open} aria-controls={id} aria-label={`${name} · ${role} · 계정 메뉴`} onClick={()=>setOpen(!open)}>{avatar}<span><b>{name}</b><small>{role}</small></span><ChevronDown size={14}/></button>
  {open&&<div className="account-panel" id={id} role="menu" aria-label="계정 메뉴">
   <div className="account-who"><b>{name}</b><small>{role}{org?' · '+org:''}</small><span className={'account-mode '+(live?'live':'demo')}>{live?'운영':'데모'}</span></div>
   {live&&onRefresh&&<button type="button" role="menuitem" onClick={run(onRefresh)} disabled={refreshing}><RefreshCw size={16}/>{refreshing?'불러오는 중':'데이터 새로고침'}</button>}
   <button type="button" role="menuitem" onClick={run(onSettings)}><Settings size={16}/>설정</button>
   {live?onLogout&&<button type="button" role="menuitem" className="danger" onClick={run(onLogout)}><LogOut size={16}/>로그아웃</button>
    :onLogin&&<button type="button" role="menuitem" onClick={run(onLogin)}><LogIn size={16}/>로그인</button>}
  </div>}
 </div>;
}
