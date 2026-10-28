import {purposes} from '../../lib/model';
// Draft-only AI assist: returns suggested visit-result fields; nothing is saved and images are not stored.
const actionTypes=['인력 충원','고객사 요청','운영환경 개선','민원 대응','안전·시설','기타'];
const schema={type:'object',additionalProperties:false,required:['detail','result','purpose','notes','extra','actions','confidence'],properties:{
 detail:{type:'string'},result:{type:'string',enum:['특이사항 없음','후속 조치 필요']},purpose:{type:'string',enum:purposes},notes:{type:'string'},
 extra:{type:'object',additionalProperties:false,required:['summary','category','urgency'],properties:{summary:{type:'string'},category:{type:'array',items:{type:'string',enum:['인력','시설·안전','고객 요청','민원','운영']}},urgency:{type:'string',enum:['낮음','보통','높음']}}},
 actions:{type:'array',items:{type:'object',additionalProperties:false,required:['type','content','dueDate'],properties:{type:{type:'string',enum:actionTypes},content:{type:'string'},dueDate:{type:'string'}}}},
 confidence:{type:'string',enum:['low','medium','high']}}};
const planSchema={type:'object',additionalProperties:false,required:['target','plannedDate','time','purpose','precheck','confidence'],properties:{target:{type:'string'},plannedDate:{type:'string'},time:{type:'string'},purpose:{type:'string',enum:purposes},precheck:{type:'string'},confidence:{type:'string',enum:['low','medium','high']}}};
const planPrompt=(today:string)=>`너는 현장·매장 방문 일정 등록을 돕는다. 담당자의 말에서 방문할 현장·매장 이름(target), 방문 예정일(plannedDate, YYYY-MM-DD), 시간(time, HH:MM 24시간, 없으면 빈 문자열), 방문 목적(purpose), 사전 확인사항(precheck)을 뽑는다. '내일', '다음주 화요일' 같은 표현은 오늘(${today}, Asia/Seoul) 기준으로 날짜를 계산한다. 말하지 않은 내용은 빈 문자열로 둔다.`;
const prompt=(today:string)=>`너는 현장·매장 방문결과 입력을 돕는다. 담당자의 메모와 사진에서 확인되는 사실만 한국어로 정리한다. 추측하지 말고, 없는 내용은 빈 문자열로 둔다. 개인 이름·연락처·주민번호는 쓰지 않는다. detail은 활동 내용 2–5문장, extra.summary는 80자 이내 한 줄. 조치가 필요할 때만 result를 '후속 조치 필요'로 하고 actions를 제안한다. dueDate는 YYYY-MM-DD, 오늘은 ${today}.`;
export async function assistVisit(req:Request,bindings:Record<string,unknown>,fetcher:typeof fetch=fetch){
 const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
 if(!req.headers.get('oai-authenticated-user-id'))return json({error:'로그인 후 이용할 수 있습니다.'},401);
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'요청 출처를 확인하세요.'},403);
 const key=String(bindings.OPENAI_API_KEY||process.env.OPENAI_API_KEY||''),model=String(bindings.OPENAI_MODEL||process.env.OPENAI_MODEL||'gpt-6-luna');
 if(!key.startsWith('sk-'))return json({error:'AI 연결 설정이 필요합니다.'},503);
 const text=await req.text();if(text.length>6_000_000)return json({error:'사진 크기를 줄여주세요.'},413);
 let body:{text?:unknown;images?:unknown;mode?:unknown};try{body=JSON.parse(text)}catch{return json({error:'입력 형식을 확인하세요.'},400)}
 const memo=typeof body.text==='string'?body.text.slice(0,3000):'',images=(Array.isArray(body.images)?body.images:[]).filter((i):i is string=>typeof i==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(i)).slice(0,3);
 if(!memo.trim()&&!images.length)return json({error:'메모나 사진을 입력하세요.'},400);
 const plan=body.mode==='plan';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
 try{const result=await fetcher('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},signal:AbortSignal.timeout(30000),body:JSON.stringify({model,
  messages:[{role:'system',content:plan?planPrompt(today):prompt(today)},{role:'user',content:[{type:'text',text:memo||'(메모 없음, 사진만 첨부)'},...images.map(url=>({type:'image_url',image_url:{url,detail:'low'}}))]}],
  response_format:{type:'json_schema',json_schema:plan?{name:'visit_plan',strict:true,schema:planSchema}:{name:'visit_draft',strict:true,schema}}})});
  const data=await result.json() as {choices:{message:{content:string}}[]};if(!result.ok)return json({error:'AI 요약에 실패했습니다. 직접 입력해 주세요.'},502);
  return json({draft:JSON.parse(data.choices[0].message.content),model,generatedAt:new Date().toISOString()});
 }catch{return json({error:'AI 응답이 지연되었습니다. 직접 입력해 주세요.'},504)}
}
