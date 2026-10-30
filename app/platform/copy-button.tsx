'use client';
// 글 복사 버튼: AI 제안 등 화면 문장을 클립보드로 복사한다. 라벨 안에 있어도 체크박스를 건드리지 않는다.
import {useState} from 'react';
import {Copy,Check} from 'lucide-react';
export function CopyButton({text,label='복사',visible}:{text:string;label?:string;visible?:string}){
 const [done,setDone]=useState(false);
 const copy=async(e:React.MouseEvent)=>{e.preventDefault();e.stopPropagation();try{await navigator.clipboard.writeText(text)}catch{const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}setDone(true);setTimeout(()=>setDone(false),1500)};
 return <button type="button" className={'copy-btn'+(visible?' with-text':'')} onClick={copy} disabled={!text} aria-label={done?'복사했어요':label} title={done?'복사했어요':label}>{done?<Check size={16} aria-hidden="true"/>:<Copy size={16} aria-hidden="true"/>}{visible?<span aria-live="polite">{done?'복사됨':visible}</span>:<span aria-live="polite" className={done?'':'sr-only'}>{done?'복사됨':''}</span>}</button>;
}
