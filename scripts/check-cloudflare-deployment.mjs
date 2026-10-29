// 공개 주소의 커밋과 인증 경계를 확인한다. 토큰·로그인 계정은 사용하지 않는다.
import {pathToFileURL} from 'node:url';
export async function checkDeployment(base,sha,fetcher=fetch){
 const origin=new URL(base).origin;
 if(!origin.startsWith('https://')||!sha||!/^[a-f0-9]{7,40}$/.test(sha))throw Error('HTTPS 배포 주소와 커밋 SHA가 필요합니다.');
 const get=path=>fetcher(origin+path,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
 const demo=await get('/?mode=demo');if(!demo.ok)throw Error('데모 화면 응답 오류: '+demo.status);
 const version=await get('/version.json');if(!version.ok)throw Error('배포 버전 응답 오류: '+version.status);
 const info=await version.json(),commit=String(info.commit||'');
 if(info.dev!==false||commit.length<7||!sha.startsWith(commit)||commit.includes('+'))throw Error('검증한 커밋과 공개 배포가 다릅니다.');
 const auth=await get('/api/auth/config');if(!auth.ok||(await auth.json()).provider!=='supabase-email')throw Error('로그인 설정이 일치하지 않습니다.');
 if((await get('/api/platform')).status!==401)throw Error('비로그인 데이터 접근이 차단되지 않았습니다.');
 if((await get('/api/data')).status!==503)throw Error('기존 D1 API가 차단되지 않았습니다.');
 return {origin,version:info.version,commit};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let result;
 for(let attempt=1;attempt<=3;attempt++){
  try{result=await checkDeployment(process.argv[2],process.argv[3]);break}catch(error){if(attempt===3)throw error;await new Promise(resolve=>setTimeout(resolve,5000))}
 }
 console.log(JSON.stringify(result));
}
