'use client';
import {useState,type FormEvent} from 'react';
export default function EmailLogin(){
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');try{
  const r=await fetch('/api/auth/request-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
  const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||'로그인 링크를 보내지 못했습니다.');
  setMessage('등록된 이메일이면 로그인 링크가 발송됩니다. 메일의 링크를 이 브라우저에서 열어 주세요.');
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <form className="email-login" onSubmit={submit}>
  <label htmlFor="zf-login-email">등록된 이메일</label>
  <input id="zf-login-email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/>
  {message&&<p role="status">{message}</p>}{error&&<div className="notice" role="alert">{error}</div>}
  <button className="btn primary" type="submit" disabled={busy}>{busy?'처리 중…':'이메일로 로그인 링크 받기'}</button>
 </form>;
}
