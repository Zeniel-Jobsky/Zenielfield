// 매장·주소 검색: 위치 정보 기능을 끄면서(2026-10-28) 외부 지도 API(Kakao) 호출과 키 사용을 없앴다. 키를 읽지 않고 항상 꺼짐을 알린다.
export async function geoSearch(req:Request,_bindings:Record<string,unknown>,_fetcher:typeof fetch=fetch){
 const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
 if(!req.headers.get('oai-authenticated-user-id'))return json({error:'로그인 후 이용할 수 있습니다.'},401);
 return json({error:'위치 검색 기능이 꺼져 있습니다.'},410);
}
