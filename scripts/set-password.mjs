// 운영자용: 등록된 사용자(zf_users)의 로그인 비밀번호를 설정한다. 서버 토큰(.env)을 가진 사람만 실행할 수 있다.
// 사용: node --env-file=.env scripts/set-password.mjs <email> <password>
const [email,password]=process.argv.slice(2);
if(!email||!password||password.length<8){console.error('사용: node --env-file=.env scripts/set-password.mjs <email> <8자 이상 비밀번호>');process.exit(1)}
const url=process.env.ZENIFIELD_SUPABASE_URL,token=process.env.ZENIFIELD_GATEWAY_TOKEN;if(!url||!token){console.error('.env에 ZENIFIELD_SUPABASE_URL, ZENIFIELD_GATEWAY_TOKEN 필요');process.exit(1)}
const r=await fetch(url+'/functions/v1/zenifield-cloudflare',{method:'POST',headers:{'Content-Type':'application/json','x-zenifield-gateway':token},body:JSON.stringify({operation:'operator-set-password',email,password})});
const d=await r.json();console.log(r.status,d.ok?(d.created?'계정 생성 + 비밀번호 설정':'비밀번호 변경'):d.error);process.exitCode=r.ok?0:1;
