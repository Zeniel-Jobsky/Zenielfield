'use client';
import {useState,type FormEvent} from 'react';
// 회사 계정 로그인: 등록된 이메일 + 비밀번호. 비밀번호가 없거나 잊은 경우 이메일 로그인 링크를 쓴다.
export default function EmailLogin(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[link,setLink]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');try{
  const r=await fetch(link?'/api/auth/request-link':'/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(link?{email}:{email,password})});
  const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||(link?'로그인 링크를 보내지 못했습니다.':'로그인하지 못했습니다.'));
  if(link)setMessage('등록된 이메일이면 로그인 링크가 발송됩니다. 메일의 링크를 이 브라우저에서 열어 주세요.');else{setMessage('로그인되었습니다. 운영 데이터를 불러옵니다…');window.location.replace('/')}
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <form className="email-login" onSubmit={submit}>
  <label htmlFor="zf-login-email">회사 이메일</label>
  <input id="zf-login-email" type="email" autoComplete="username" required maxLength={254} value={email} disabled={busy} onChange={e=>setEmail(e.target.value)} placeholder="name@zeniel.co.kr"/>
  {!link&&<><label htmlFor="zf-login-password">비밀번호</label><input id="zf-login-password" type="password" autoComplete="current-password" required minLength={8} maxLength={72} value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/></>}
  {message&&<p role="status">{message}</p>}{error&&<div className="notice" role="alert">{error}</div>}
  <button className="btn primary" type="submit" disabled={busy}>{busy?'처리 중…':link?'이메일로 로그인 링크 받기':'로그인'}</button>
  <button type="button" className="textbtn" onClick={()=>{setLink(!link);setError('');setMessage('')}}>{link?'비밀번호로 로그인':'비밀번호가 없거나 잊었어요 · 이메일 링크로 로그인'}</button>
 </form>;
}
