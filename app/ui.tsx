'use client';
import {useEffect,useId,useRef,type ReactNode} from 'react';
import {X,Inbox,Check,ChevronRight,type LucideIcon} from 'lucide-react';
export function Badge({children}:{children:ReactNode}){const s=String(children);const color=/지연|초과|높음|위험/.test(s)?'red':/완료|정상|활성/.test(s)&&!s.includes('비활성')?'green':/보류|도래|없음|미확인|미등록/.test(s)?'amber':/예정|처리 중|진행/.test(s)?'blue':'gray';return <span className={'badge '+color}><i/>{children}</span>}
export function Avatar({name,index=0}:{name:string;index?:number}){return <span className={'avatar avatar-'+index%4}>{name.slice(0,1)}</span>}
export function Empty({text='조회할 기록이 없습니다.',description='검색 조건을 변경하거나 새로운 기록을 등록해 주세요.',action}:{text?:string;description?:string;action?:ReactNode}){return <div className="empty"><span className="empty-icon"><Inbox size={25}/></span><b>{text}</b><p>{description}</p>{action}</div>}
export function Drawer({title,sub,children,onClose,busy=false}:{title:string;sub:string;children:ReactNode;onClose:()=>void;busy?:boolean}){
 const ref=useRef<HTMLDialogElement>(null),dirty=useRef(false);
 const titleId=useId();
 useEffect(()=>{
  const d=ref.current,previous=document.activeElement as HTMLElement|null;
  d?.showModal();
  function protect(e:BeforeUnloadEvent){if(dirty.current){e.preventDefault();e.returnValue=''}}
  window.addEventListener('beforeunload',protect);
  return()=>{window.removeEventListener('beforeunload',protect);d?.close();previous?.focus()};
 },[]);
 function close(){
  if(busy)return;
  if(dirty.current&&!window.confirm('저장하지 않은 변경 내용이 있습니다. 변경 내용을 버리고 나갈까요?'))return;
  onClose();
 }
 return <dialog className="drawer" ref={ref} aria-labelledby={titleId} aria-busy={busy}
  onInputCapture={()=>{dirty.current=true}} onChangeCapture={()=>{dirty.current=true}}
  onCancel={e=>{e.preventDefault();close()}}
  onClick={e=>{if(e.target===e.currentTarget)close()}}
  onClickCapture={e=>{const el=e.target as HTMLElement;if(el.closest('form button[type="button"]')&&!el.closest('.form-footer'))dirty.current=true}}
 >
  <div className="drawer-head"><div><span>{sub}</span><h2 id={titleId}>{title}</h2></div><button type="button" className="iconbtn" disabled={busy} aria-label="닫기" onClick={close}><X size={20}/></button></div>
  <div className="drawer-body" onClickCapture={e=>{const el=e.target as HTMLElement;if(el.closest('.form-footer button[type="button"]')){e.preventDefault();e.stopPropagation();close()}}}>{children}</div>
 </dialog>
}
export function Field({label,children,wide=false}:{label:string;children:ReactNode;wide?:boolean}){return <label className={'field '+(wide?'wide':'')}><span>{label}</span>{children}</label>}
export function PanelTitle({title,count,sub,children}:{title:string;count?:number;sub?:string;children?:ReactNode}){return <div className="panel-heading"><div><h2>{title}{count!==undefined&&<span className="count">{count}</span>}</h2>{sub&&<p>{sub}</p>}</div><div className="panel-tools">{children}</div></div>}
export function Metric({label,value,unit='건',icon:Icon,tone='blue',note,onClick}:{label:string;value:number|string;unit?:string;icon:LucideIcon;tone?:string;note:string;onClick:()=>void}){return <button className={'metric '+tone} onClick={onClick}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={19}/></span></div><div className="metric-value">{value}<small>{unit}</small><ChevronRight size={17}/></div><p>{note}</p></button>}
export const nice=(date:string|null|undefined)=>date?date: '—';
export const short=(date:string|null|undefined)=>date?date.slice(5).replace('-','.'): '—';
export function Progress({value,label}:{value:number|null;label?:string}){return <div className="progress-wrap"><div className="progress-track"><div style={{width:`${value??0}%`}}/></div><b>{value===null?'—':value+'%'}</b>{label&&<span>{label}</span>}</div>}
