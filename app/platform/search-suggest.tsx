'use client';
// 통합 검색 자동완성: 담당자·현장·매장을 한 글자부터 추천한다(초성 검색 포함). 고르면 그 범위로 바로 좁힌다.
// 범위는 이미 권한으로 걸러진 대상(visibleTargets)과 그 담당자만. 키보드 ↑↓·Enter·Esc, combobox 역할.
import {useId,useMemo,useRef,useState} from 'react';
import {Search,X,User as UserIcon,Building2,Store as StoreIcon} from 'lucide-react';

export type Suggestion={kind:'manager'|'site'|'store';id:string;label:string;sub:string};
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
// 한글 음절을 초성으로 바꾼다(그 외 글자는 그대로, 소문자)
export const initials=(s:string)=>[...s].map(ch=>{const c=ch.charCodeAt(0)-0xac00;return c>=0&&c<11172?CHO[Math.floor(c/588)]:ch.toLowerCase()}).join('');
const onlyCho=(q:string)=>/^[ㄱ-ㅎ\s]+$/.test(q);
export function matchSuggestions(all:Suggestion[],q:string,limit=8){
 const t=q.trim().toLowerCase();if(!t)return [];const cho=onlyCho(t);
 const hit=(s:Suggestion)=>{const l=s.label.toLowerCase();return cho?initials(l).replace(/\s/g,'').includes(t.replace(/\s/g,'')):l.includes(t)||s.sub.toLowerCase().includes(t)};
 const rank=(s:Suggestion)=>(s.label.toLowerCase().startsWith(t)||cho&&initials(s.label).startsWith(t)?0:1)+({manager:0,site:1,store:2}[s.kind]*0.1);
 return all.filter(hit).sort((a,b)=>rank(a)-rank(b)||a.label.localeCompare(b.label)).slice(0,limit);
}
const ICON={manager:UserIcon,site:Building2,store:StoreIcon},KIND={manager:'담당자',site:'현장',store:'매장'};
export function SearchSuggest({value,onChange,options,onPick,label,className}:{value:string;onChange:(v:string)=>void;options:Suggestion[];onPick:(s:Suggestion)=>void;label:string;className:string}){
 const [open,setOpen]=useState(false),[active,setActive]=useState(0),id=useId(),input=useRef<HTMLInputElement>(null);
 const list=useMemo(()=>matchSuggestions(options,value),[options,value]),show=open&&list.length>0;
 const pick=(s:Suggestion)=>{onPick(s);setOpen(false);input.current?.blur()};
 return <label className={className+' search-suggest'}>
  <Search size={16}/>
  <input ref={input} role="combobox" aria-label={label} aria-expanded={show} aria-controls={id} aria-autocomplete="list" aria-activedescendant={show?`${id}-${active}`:undefined} placeholder="현장, 매장, 담당자 검색" value={value}
   onChange={e=>{onChange(e.target.value);setOpen(true);setActive(0)}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),120)}
   onKeyDown={e=>{if(!show)return;if(e.key==='ArrowDown'){e.preventDefault();setActive((active+1)%list.length)}else if(e.key==='ArrowUp'){e.preventDefault();setActive((active-1+list.length)%list.length)}else if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();pick(list[active])}else if(e.key==='Escape')setOpen(false)}}/>
  {value&&<button type="button" className="iconbtn" aria-label="검색 지우기" onClick={()=>{onChange('');input.current?.focus()}}><X size={14}/></button>}
  {show&&<ul className="suggest-list" id={id} role="listbox" aria-label="검색 추천">{list.map((s,i)=>{const I=ICON[s.kind];return <li key={s.kind+s.id} id={`${id}-${i}`} role="option" aria-selected={i===active} className={i===active?'on':''} onMouseDown={e=>{e.preventDefault();pick(s)}} onMouseEnter={()=>setActive(i)}><I size={14}/><span><b>{s.label}</b><small>{KIND[s.kind]} · {s.sub}</small></span></li>})}</ul>}
 </label>;
}
