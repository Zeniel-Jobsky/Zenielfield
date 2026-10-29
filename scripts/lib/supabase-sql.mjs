// Supabase Management API SQL 실행 도우미: 스크립트마다 같은 fetch를 다시 만들지 않는다.
// 실패하면 'SQL HTTP 상태 본문'으로 예외를 던진다(종료 여부는 부르는 스크립트가 정한다). 응답은 JSON이면 객체, 아니면 글자.
export function supabaseSql({ref=process.env.SUPABASE_PROJECT_REF,token=process.env.SUPABASE_ACCESS_TOKEN}={}){
 return async query=>{
  const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query})});
  const text=await r.text();if(!r.ok)throw new Error(`SQL HTTP ${r.status} ${text.slice(0,400)}`);
  try{return JSON.parse(text)}catch{return text}
 };
}
