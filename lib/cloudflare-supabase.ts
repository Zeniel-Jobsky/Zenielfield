import {assistVisit} from '../app/api/assist/server';
import {geoSearch} from '../app/api/geo/server';
type Bindings={ZENIFIELD_SUPABASE_URL?:string;ZENIFIELD_GATEWAY_TOKEN?:string;OPENAI_API_KEY?:string;OPENAI_MODEL?:string;KAKAO_REST_API_KEY?:string};
const ACCESS='__Host-zf-access',REFRESH='__Host-zf-refresh';
const VERIFIER='__Host-zf-verifier';
const base64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const response=(body:unknown,status=200,headers?:HeadersInit)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
function cookie(request:Request,name:string){const values=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));return values.length===1?values[0].slice(name.length+1):'';}
function setSession(headers:Headers,session:any){
 if(typeof session?.access_token!=='string'||typeof session?.refresh_token!=='string')return;
 const age=Math.max(60,Math.min(86400,Number(session.expires_in)||3600));
 headers.append('Set-Cookie',`${ACCESS}=${session.access_token}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`);
 headers.append('Set-Cookie',`${REFRESH}=${session.refresh_token}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`);
}
function clearSession(headers:Headers){for(const name of [ACCESS,REFRESH])headers.append('Set-Cookie',`${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);}
export async function handleCloudflareSupabase(request:Request,env:Bindings,fetcher:typeof fetch=fetch):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/auth/config')return response({provider:'supabase-email'});
 if(path==='/signin-with-chatgpt'||path==='/callback')return Response.redirect(url.origin+'/?mode=supabase',302);
 if(path==='/signout-with-chatgpt')return response({error:'화면의 로그아웃 버튼을 이용해 주세요.'},405);
 const callback=path==='/auth/callback',auth=path.startsWith('/api/auth/')||callback,platform=path==='/api/platform',assist=path==='/api/assist',geo=path==='/api/geo';
 if(!auth&&!platform&&!assist&&!geo){if(path.startsWith('/api/'))return response({error:'기존 D1 운영은 Sites 인증 환경에서 이용해 주세요.'},503);return null;}
 const operations:Record<string,string>={'/api/auth/request-link':'request-link','/auth/callback':'exchange-code','/api/auth/logout':'logout','/api/auth/session':'session'};
 const operation=(assist||geo)?'session':platform?(request.method==='POST'?'save':'read'):operations[path];
 if(!operation)return response({error:'지원하지 않는 요청입니다.'},404);
 const expected=assist?'POST':['read','session','exchange-code'].includes(operation)?'GET':'POST';
 if(request.method!==expected)return response({error:'지원하지 않는 요청입니다.'},405);
 if(expected==='POST'&&request.headers.get('origin')!==url.origin)return response({error:'요청 출처를 확인하세요.'},403);
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.ZENIFIELD_SUPABASE_URL||'')||!env.ZENIFIELD_GATEWAY_TOKEN)return response({error:'Supabase 연결 설정이 필요합니다.'},503);
 const accessToken=cookie(request,ACCESS),refreshToken=cookie(request,REFRESH);
 if(!['request-link','exchange-code'].includes(operation)&&!accessToken&&!refreshToken)return response({error:'이메일 인증으로 로그인해 주세요.'},401);
 try{
  const text=expected==='POST'&&!assist?await request.text():'{}';if(text.length>65536)return response({error:'입력 크기를 줄여주세요.'},413);
  const body=JSON.parse(text||'{}');
  let verifier='',codeChallenge='';
  if(operation==='request-link'){verifier=base64url(crypto.getRandomValues(new Uint8Array(32)));codeChallenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));}
  if(callback&&!cookie(request,VERIFIER))return Response.redirect(url.origin+'/?mode=supabase&auth_error=browser',302);
  const r=await fetcher(env.ZENIFIELD_SUPABASE_URL+'/functions/v1/zenifield-cloudflare',{method:'POST',headers:{'Content-Type':'application/json','x-zenifield-gateway':env.ZENIFIELD_GATEWAY_TOKEN},body:JSON.stringify({operation,email:body.email,codeChallenge,redirectTo:url.origin+'/auth/callback',authCode:callback?url.searchParams.get('code'):undefined,codeVerifier:callback?cookie(request,VERIFIER):undefined,entity:body.entity,id:body.id,version:body.version,values:body.values,accessToken,refreshToken}),signal:AbortSignal.timeout(25000)});
  const data=await r.json() as any;
  const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store'});
  if(r.ok)setSession(headers,data.session);
  if(r.ok&&verifier)headers.append('Set-Cookie',`${VERIFIER}=${verifier}; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax`);
  if(operation==='logout'||r.status===401||r.status===403)clearSession(headers);
  if((assist||geo)&&r.ok){
   if(!data.me?.id)return response({error:'등록된 사용자만 이용할 수 있습니다.'},403);
   const trusted=new Headers(request.headers);
   for(const name of [...trusted.keys()])if(name.startsWith('oai-authenticated-user-'))trusted.delete(name);
   trusted.set('oai-authenticated-user-id',data.me.id);
   trusted.set('oai-authenticated-user-email',data.me.email);
   const authorized=new Request(request,{headers:trusted});
   const draft=await (geo?geoSearch(authorized,env,fetcher):assistVisit(authorized,env,fetcher));
   const merged=new Headers(headers);
   for(const [name,value] of draft.headers)merged.set(name,value);
   return new Response(draft.body,{status:draft.status,headers:merged});
  }
  if(callback){headers.append('Set-Cookie',`${VERIFIER}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);headers.set('Location',url.origin+'/?mode=supabase'+(r.ok?'':'&auth_error=link'));return new Response(null,{status:302,headers});}
  // Session tokens terminate at the Worker; never serialize them to the browser.
  const output=platform?(data.payload||{error:data.error||'데이터를 불러오지 못했습니다.'}):{ok:data.ok,me:data.me,error:data.error};
  return new Response(JSON.stringify(output),{status:r.status,headers});
 }catch{
  if(operation==='logout'){
   const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store'});clearSession(headers);
   return new Response(JSON.stringify({ok:true}),{headers});
  }
  return response({error:'Supabase 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.'},502);
 }
}
