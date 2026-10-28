export async function forwardPlatform(req:Request,bindings:Record<string,unknown>,fetcher:typeof fetch=fetch){
 const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
 const subject=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email');
 if(!subject||!email)return json({error:'로그인 후 이용할 수 있습니다.'},401);
 if(req.method==='POST'&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'요청 출처를 확인하세요.'},403);
 const url=String(bindings.ZENIFIELD_SUPABASE_URL||process.env.ZENIFIELD_SUPABASE_URL||''),token=String(bindings.ZENIFIELD_GATEWAY_TOKEN||process.env.ZENIFIELD_GATEWAY_TOKEN||'');
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)||!token)return json({error:'Supabase 연결 설정이 필요합니다.'},503);
 try{let body:Record<string,unknown>={};if(req.method==='POST'){const text=await req.text();if(text.length>65536)return json({error:'입력 크기를 줄여주세요.'},413);body=JSON.parse(text);}
 const result=await fetcher(url+'/functions/v1/zenifield-gateway',{method:'POST',headers:{'Content-Type':'application/json','x-zenifield-gateway':token},body:JSON.stringify({entity:body.entity,id:body.id,version:body.version,values:body.values,from:new URL(req.url).searchParams.get('from')||undefined,to:new URL(req.url).searchParams.get('to')||undefined,operation:req.method==='POST'?'save':'read',subject,email}),signal:AbortSignal.timeout(20000)});
 const data=await result.json();return json(data,result.status);
 }catch{return json({error:'Supabase에 연결하지 못했습니다. 잠시 후 다시 시도하세요.'},502)}
}
