'use client';
import {BrandIdentity} from '../brand';
import {useEffect,useState} from 'react';
import {Database,RefreshCw,ArrowRight,ShieldCheck} from 'lucide-react';
import PlatformApp from './app';
import LegacyFieldApp from '../field-app';
import type {User} from '../lib/model';
import type {PlatformData} from './model';
import EmailLogin from './email-login';
export type OperatingData=PlatformData&{me:User};
export default function PlatformEntry(){
 const [emailAuth,setEmailAuth]=useState(false);
 useEffect(()=>{fetch('/api/auth/config').then(async r=>r.ok?await r.json() as {provider?:string}:null).then(d=>setEmailAuth(d?.provider==='supabase-email')).catch(()=>{});},[]);
 const [mode,setMode]=useState<'demo'|'supabase'|'legacy'>('demo'),[data,setData]=useState<OperatingData|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(0);
 async function refresh(){setLoading(true);setError('');setStatus(0);try{const r=await fetch('/api/platform',{cache:'no-store'}),d=await r.json() as OperatingData&{error?:string};if(!r.ok){setStatus(r.status);throw Error(d.error||'불러오지 못했습니다.')}setData(d);setStatus(200)}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 function select(next:'demo'|'supabase'|'legacy'){setMode(next);setData(null);window.history.replaceState(null,'',next==='supabase'?'?mode=supabase':window.location.pathname);if(next==='supabase')refresh()}
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('mode')==='supabase'){setMode('supabase');refresh().then(()=>{if(new URLSearchParams(window.location.search).has('auth_error'))setError('로그인 링크가 만료되었거나 요청한 브라우저와 다릅니다. 이 브라우저에서 새 링크를 요청해 주세요.');})}},[]);
 async function save(entity:string,values:unknown,record?:{id:string;version:number}){const r=await fetch('/api/platform',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entity,values,id:record?.id,version:record?.version})});const d=await r.json() as {data:OperatingData;item:any;error?:string};if(!r.ok)throw Error(d.error||'저장하지 못했습니다.');setData(d.data);return d}
 async function logout(){try{await fetch('/api/auth/logout',{method:'POST'})}finally{setData(null);setStatus(401);setError('로그아웃했습니다.')}}
 if(mode==='legacy')return <LegacyFieldApp startLive onPlatformDemo={()=>select('demo')}/>;
 if(mode==='demo')return <PlatformApp key="demo" onConnect={()=>select('supabase')}/>;
 if(data)return <PlatformApp key="supabase" initialData={data} liveMode onSaveLive={save} onDemo={()=>select('demo')} onLegacy={emailAuth?undefined:()=>select('legacy')} onLogout={emailAuth?logout:undefined} onRefresh={refresh} connectionError={error} connectionStatus={status} refreshing={loading}/>;
 return <main className="supabase-entry"><a className="brand" href="/" onClick={e=>{e.preventDefault();select('demo')}}><BrandIdentity/></a><section className="panel"><span className="entry-icon"><Database size={30}/></span><h1>Supabase 운영 워크스페이스</h1><p>현장·매장과 방문 결과를 중앙 데이터베이스에 저장합니다.</p>{loading?<div className="loading-state" role="status">운영 데이터를 불러오는 중입니다.</div>:<><div className="notice" role="alert">{error||'등록된 계정으로 로그인해 주세요.'}</div>{status===401&&emailAuth&&<EmailLogin/>}{status===401&&!emailAuth&&<a className="btn primary" href="/signin-with-chatgpt?return_to=%2F%3Fmode%3Dsupabase" target="_top">ChatGPT로 로그인<ArrowRight size={16}/></a>}<button className="btn" onClick={refresh}><RefreshCw size={15}/>다시 시도</button><button className="textbtn" onClick={()=>select('demo')}>데모 화면 보기<ArrowRight size={14}/></button></>}<div className="entry-security"><ShieldCheck size={15}/>등록된 계정과 조직·담당 범위에 따라 접근합니다. 기존 D1 자료는 별도 보존됩니다.</div></section></main>
}
