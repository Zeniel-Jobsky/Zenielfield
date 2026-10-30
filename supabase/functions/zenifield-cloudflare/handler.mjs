import {createHandler} from '../zenifield-gateway/handler.mjs';
// 계정 전환 중 기존 링크도 유지한다. 정확한 콜백만 허용하고 와일드카드는 쓰지 않는다.
const demoProject=(Deno.env.get('SUPABASE_URL') || '').includes('nhywssfwtnonytbkufyy.supabase.co');
// Cross-environment OAuth callbacks are not allowed.
const loginCallbacks=new Set(demoProject
 ? ['https://zenifield.jobsky.workers.dev/auth/callback', 'https://zenifield.ugen-kwon.workers.dev/auth/callback']
 : ['https://zenifield-live.jobsky.workers.dev/auth/callback']);

// tokenHash: one hash or a list (Cloudflare Worker token, Sites server token). Both are server-only secrets.
export function createCloudflareHandler({url,key,tokenHash,fetcher=fetch}) {
 const hashes=(Array.isArray(tokenHash)?tokenHash:[tokenHash]).filter(Boolean);
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 const serviceHeaders={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 const call=(path,init={})=>fetcher(url+path,{...init,headers:{...serviceHeaders,...init.headers},signal:AbortSignal.timeout(15000)});
 async function profile(email) {
  const r=await call('/rest/v1/zf_users?email=eq.'+encodeURIComponent(email)+'&active=eq.1&select=id,subject,email,name,role,team,part,active,version');
  if(!r.ok)throw Error('PROFILE');
  const rows=await r.json();return rows.length===1?rows[0]:null;
 }
 async function user(accessToken) {
  if(!accessToken)return null;
  const r=await call('/auth/v1/user',{headers:{Authorization:'Bearer '+accessToken}});
  if(!r.ok)return null;
  const u=await r.json();return u.id&&u.email&&u.email_confirmed_at?u:null;
 }
 const originals=new Map(hashes.map(h=>[h,createHandler({url,key,tokenHash:h,fetcher})]));
 return async request=>{
  if(request.method!=='POST')return reply({error:'지원하지 않는 요청입니다.'},405);
  const token=request.headers.get('x-zenifield-gateway')||'';
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  if(!hashes.includes(digest))return reply({error:'인증되지 않은 서버 요청입니다.'},401);
  try {
   const text=await request.text();if(text.length>65536)return reply({error:'입력 크기를 줄여주세요.'},413);
   const body=JSON.parse(text);
   if(body.operation==='request-link') {
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    if(!/^\S+@\S+\.\S+$/.test(email)||email.length>254)return reply({error:'이메일을 확인하세요.'},400);
    // Do not expose whether a submitted address is registered.
    if(!await profile(email))return reply({ok:true});
    if(!/^[A-Za-z0-9_-]{43}$/.test(body.codeChallenge||'')||!loginCallbacks.has(body.redirectTo))return reply({error:'로그인 요청을 확인하세요.'},400);
    const r=await call('/auth/v1/otp?redirect_to='+encodeURIComponent(body.redirectTo),{method:'POST',body:JSON.stringify({email,create_user:true,code_challenge:body.codeChallenge,code_challenge_method:'s256'})});
    if(!r.ok)return reply({error:r.status===429?'잠시 후 로그인 링크를 다시 요청해 주세요.':'인증 메일을 보내지 못했습니다. 이메일 발송 설정을 확인해 주세요.'},r.status===429?429:502);
    return reply({ok:true});
   }
   const validPassword=p=>typeof p==='string'&&p.length>=8&&p.length<=72;
   // Sets an Auth password for a registered, active zf_users email. Creates the Auth user when missing.
   async function setPassword(email,password) {
    if(!await profile(email))return reply({error:'등록된 활성 사용자가 아닙니다.'},404);
    const created=await call('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({email,password,email_confirm:true})});
    if(created.ok)return reply({ok:true,created:true});
    for(let page=1;page<=20;page++){const r=await call('/auth/v1/admin/users?per_page=200&page='+page);if(!r.ok)break;const list=(await r.json()).users||[];const hit=list.find(u=>(u.email||'').toLowerCase()===email);
     if(hit){const u=await call('/auth/v1/admin/users/'+hit.id,{method:'PUT',body:JSON.stringify({password,email_confirm:true})});return u.ok?reply({ok:true,created:false}):reply({error:'비밀번호를 설정하지 못했습니다.'},502)}if(list.length<200)break}
    return reply({error:'인증 계정을 만들지 못했습니다.'},502);
   }
   // Operator path: only callers holding the server token reach it; the Worker never forwards this operation.
   if(body.operation==='operator-set-password') {
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    if(!/^\S+@\S+\.\S+$/.test(email)||!validPassword(body.password))return reply({error:'이메일과 8자 이상 비밀번호를 확인하세요.'},400);
    return await setPassword(email,body.password);
   }
   let session=null,accessToken=typeof body.accessToken==='string'?body.accessToken:'';
   if(body.operation==='password-login') {
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    if(!/^\S+@\S+\.\S+$/.test(email)||!validPassword(body.password))return reply({error:'이메일과 비밀번호를 확인하세요.'},400);
    if(!await profile(email))return reply({error:'이메일 또는 비밀번호가 올바르지 않습니다.'},401);
    const r=await call('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password:body.password})});
    if(!r.ok)return reply({error:r.status===429?'잠시 후 다시 시도해 주세요.':'이메일 또는 비밀번호가 올바르지 않습니다.'},r.status===429?429:401);
    session=await r.json();accessToken=session.access_token;
   }
   if(body.operation==='exchange-code') {
    if(typeof body.authCode!=='string'||typeof body.codeVerifier!=='string'||body.authCode.length>200||body.codeVerifier.length>200)return reply({error:'로그인 링크를 확인하세요.'},400);
    const r=await call('/auth/v1/token?grant_type=pkce',{method:'POST',body:JSON.stringify({auth_code:body.authCode,code_verifier:body.codeVerifier})});
    if(!r.ok)return reply({error:'로그인 링크가 만료되었거나 요청한 브라우저와 다릅니다.'},401);
    session=await r.json();accessToken=session.access_token;
   }
   let authenticated=await user(accessToken);
   if(!authenticated&&typeof body.refreshToken==='string'&&body.refreshToken) {
    const r=await call('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:body.refreshToken})});
    if(r.ok){session=await r.json();accessToken=session.access_token;authenticated=await user(accessToken);}
   }
   if(!authenticated)return reply({error:'이메일 인증으로 로그인해 주세요.'},401);
   const actor=await profile(authenticated.email.trim().toLowerCase());
   if(!actor)return reply({error:'등록된 활성 사용자만 접근할 수 있습니다.'},403);
   // Preserve previously linked Sites subjects. A new Cloudflare test account
   // receives a separate subject and cannot replace another user's identity.
   const subject=actor.subject||'supabase:'+authenticated.id;
   if(body.operation==='logout') {
    await call('/auth/v1/logout?scope=local',{method:'POST',headers:{Authorization:'Bearer '+accessToken}});
    return reply({ok:true});
   }
   // 본인 비밀번호 정하기: 이메일 링크·비밀번호로 확인된 세션의 본인 메일에만 쓴다(다른 사람 메일은 받지 않는다).
   if(body.operation==='change-own-password') {
    if(!validPassword(body.password))return reply({error:'8자 이상 72자 이하로 정해 주세요.'},400);
    return await setPassword(actor.email,body.password);
   }
   if(body.operation==='set-password') {
    if(actor.role!=='admin')return reply({error:'시스템 관리자만 비밀번호를 설정할 수 있습니다.'},403);
    const email=typeof body.targetEmail==='string'?body.targetEmail.trim().toLowerCase():'';
    if(!/^\S+@\S+\.\S+$/.test(email)||!validPassword(body.password))return reply({error:'이메일과 8자 이상 비밀번호를 확인하세요.'},400);
    return await setPassword(email,body.password);
   }
   if(body.operation==='exchange-code'||body.operation==='session'||body.operation==='password-login') {
    return reply({ok:true,me:{id:actor.id,email:actor.email,name:actor.name,role:actor.role},...(session?{session}:{} )});
   }
   if(!['read','save'].includes(body.operation))return reply({error:'지원하지 않는 요청입니다.'},400);
   const result=await originals.get(digest)(new Request(request.url,{method:'POST',headers:{'x-zenifield-gateway':token,'Content-Type':'application/json'},body:JSON.stringify({operation:body.operation,entity:body.entity,id:body.id,version:body.version,values:body.values,from:body.from,to:body.to,subject,email:actor.email})}));
   return reply({payload:await result.json(),...(session?{session}:{})},result.status);
  } catch {
   return reply({error:'요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'},502);
  }
 };
}
