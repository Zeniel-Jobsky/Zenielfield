// 매장 검색·주소 좌표 변환: Kakao Local API 프록시. 키는 서버에만 두고 결과 5건만 돌려준다.
export type Place={name:string;address:string;roadAddress:string;category:string;lat:number;lng:number};
const base='https://dapi.kakao.com/v2/local/search/';
export async function searchPlaces(q:string,key:string,fetcher:typeof fetch=fetch):Promise<Place[]>{
 const call=async(kind:'keyword'|'address')=>{const r=await fetcher(`${base}${kind}.json?size=5&query=${encodeURIComponent(q)}`,{headers:{Authorization:'KakaoAK '+key},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('검색 서비스 오류 '+r.status);return ((await r.json()) as {documents:any[]}).documents};
 const toPlace=(d:any):Place=>({name:d.place_name||d.address_name||'',address:d.address_name||d.address?.address_name||'',roadAddress:d.road_address_name||d.road_address?.address_name||'',category:d.category_name||'',lat:+Number(d.y).toFixed(6),lng:+Number(d.x).toFixed(6)});
 const byAddress=(await call('address')).map(toPlace);return (byAddress.length?byAddress:(await call('keyword')).map(toPlace)).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
}
export async function geoSearch(req:Request,bindings:Record<string,unknown>,fetcher:typeof fetch=fetch){
 const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
 if(!req.headers.get('oai-authenticated-user-id'))return json({error:'로그인 후 이용할 수 있습니다.'},401);
 const key=String(bindings.KAKAO_REST_API_KEY||process.env.KAKAO_REST_API_KEY||'');if(!key)return json({error:'매장 검색 설정(KAKAO_REST_API_KEY)이 필요합니다.'},503);
 const q=(new URL(req.url).searchParams.get('q')||'').trim().slice(0,100);if(q.length<2)return json({error:'검색어를 2자 이상 입력하세요.'},400);
 try{return json({places:await searchPlaces(q,key,fetcher)})}catch(e){return json({error:(e as Error).message||'검색에 실패했습니다.'},502)}
}
