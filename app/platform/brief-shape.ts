// AI 브리핑 출력 구조(모델에 주는 스키마)와 정리 함수. 서버(응답 직후)와 화면(저장본 읽기)이 같은 함수를 쓴다.
// 구멍 막기: 받는 사람·직급은 입력(tellTo·role)으로만 주고 출력에는 그 칸이 없다. 전할 말은 {잘한 점, 부탁},
// 판단은 {주제, 안①, 안②}(각 {할 일, 좋아지는 점, 확인할 것})로 고정해 추천 칸이 없다. 칸 안에 남은 머리말·추천 꼬리는 걸러 낸다.
// 조각 의미: num·bad·good = 강조, site·store·region = 현장·매장·영업권 이름(종류별 색). 한 곳에서만 정한다(DC-AI-TEXT).
export const TONES=['num','bad','good','site','store','region'] as const;
export type Tone=typeof TONES[number];
export const isTone=(t:unknown):t is Tone=>TONES.includes(t as Tone);
export type Seg={v:string;tone?:Tone};
export type Rich=Seg[];
const segSchema={type:'object',additionalProperties:false,required:['v','tone'],properties:{v:{type:'string'},tone:{type:'string',enum:['',...TONES]}}};
const rich={type:'array',items:segSchema};
// 출력이 길수록 느리다(초당 약 110토큰): 화면에서 겹치는 칸(흐름·강점·근거 문장)은 받지 않고, 판단은 1개·안마다 {할 일, 좋아지는 점}만
const option={type:'object',additionalProperties:false,required:['do','gain'],properties:{do:rich,gain:rich}};
export const briefOutputSchema={type:'object',additionalProperties:false,required:['headline','story','focus','directive','steps','themes','cheer','watch','confidence'],properties:{
 headline:{type:'object',additionalProperties:false,required:['situation','action'],properties:{situation:rich,action:rich}},
 cheer:{type:'object',additionalProperties:false,required:['praise','ask'],properties:{praise:rich,ask:rich}},
 themes:{type:'array',items:{type:'object',additionalProperties:false,required:['title','status','summary','targets'],properties:{title:{type:'string'},status:{type:'string',enum:['새로 생김','커짐','계속됨','해결됨','확인 필요']},summary:rich,targets:{type:'array',items:{type:'string'}}}}},
 focus:{type:'array',items:{type:'object',additionalProperties:false,required:['name','reason'],properties:{name:{type:'string'},reason:rich}}},
 story:rich,
 // 지시 가이드: 누구에게(to: 팀·파트·매니저·현장 이름 또는 '본인') 무엇을 지시할지 / 이행 가이드: 순서대로 할 일(완료 기준 포함)
 directive:{type:'array',items:{type:'object',additionalProperties:false,required:['to','say'],properties:{to:{type:'string'},say:rich}}},
 steps:{type:'array',items:rich},
 watch:{type:'array',items:rich},confidence:{type:'string',enum:['low','medium','high']}}};

// 칸 안의 구멍: 받는 사람 머리말, 추천 꼬리('먼저 ~하는 편이 좋겠습니다' 등), 앞뒤 공백
const ADDRESSEE=/^\s*(실무자|잡매니저|파트장|팀장|사업부장|담당자)(님)?(들)?(께|에게|께서는)?\s*[:：,]\s*/;
const RECOMMEND=/\s*(먼저|우선)?[^.。!?]*(편이|것이)\s*(좋겠|낫겠|바람직)[^.。!?]*[.。]?\s*$/;
const clean=(r:Rich,first=true):Rich=>{const out=r.filter(s=>s&&typeof s.v==='string').map(s=>({v:s.v,...(isTone(s.tone)?{tone:s.tone}:{})}));
 if(first&&out.length)out[0]={...out[0],v:out[0].v.replace(ADDRESSEE,'')};return out.filter(s=>s.v.length)};
// 이유 앞의 경로('부서 › 매니저 › ' 또는 '부서 › 매니저 › 대상: ')는 화면이 이름을 보이므로 뗀다
const stripPath=(r:Rich):Rich=>{if(!r.length)return r;const v=r[0].v.replace(/^(?:[^›:]{1,40}›\s*){1,3}/,'');return v===r[0].v?r:[{...r[0],v},...r.slice(1)].filter(s=>s.v.trim())};
const noTail=(r:Rich):Rich=>{if(!r.length)return r;const last=r[r.length-1],v=last.v.replace(RECOMMEND,'');return v===last.v?r:[...r.slice(0,-1),{...last,v}].filter(s=>s.v.trim())};
// 문장 사이 띄어쓰기: 마침표·물음표·느낌표 바로 뒤에 글자가 붙으면 한 칸 띄운다(조각 경계 포함). 조사 자리는 건드리지 않는다.
const spaceSentences=(r:Rich):Rich=>r.map((s,i)=>{let v=s.v.replace(/([.!?,])(?=[가-힣A-Za-z(])/g,'$1 ');const next=r[i+1];if(next&&/[.!?]$/.test(v)&&/^[가-힣A-Za-z0-9(]/.test(next.v))v+=' ';return v===s.v?s:{...s,v}});
const toRich=(x:unknown):Rich=>typeof x==='string'?(x?spaceSentences([{v:x}]):[]):Array.isArray(x)?spaceSentences(clean(x as Rich)):[];
const join=(...parts:Rich[]):Rich=>parts.filter(p=>p.length).flatMap((p,i)=>i?[{v:' '},...p]:p);
// 칸 안에 모델이 다시 쓴 번호(①②·1.·가.)는 뗀다: 번호는 구조가 붙인다
const noMark=(r:Rich):Rich=>r.length?[{...r[0],v:r[0].v.replace(/^\s*([①②③④]|\(?[0-9가나]\)|[0-9]\.)\s*/,'')},...r.slice(1)].filter(x=>x.v):r;
const opt=(o:any,mark:string):Rich=>{if(!o)return [];const d=noMark(noTail(toRich(o.do))),g=noTail(toRich(o.gain)),c=noTail(toRich(o.check));if(!d.length)return [];return join([{v:mark}],d,g.length?join([{v:'→'}],g):[],c.length?[{v:'(확인: '},...c,{v:')'}]:[])};
// 모델 출력(새 구조) → 화면 표시 형식. 옛 구조(문장 하나)도 받는다.
export function shapeBrief(x:any){
 // 받는 사람이 뭉뚱그려진 지시('세 팀 담당자'·'각 팀'·'담당자들')는 버린다
 const vague=/(담당자들|각 팀|각 파트|세 팀|전체|모든|여러)/;
 const directive=(Array.isArray(x?.directive)?x.directive:[]).filter((d:any)=>d&&typeof d.to==='string'&&d.to.trim()&&!vague.test(d.to)).map((d:any)=>({to:d.to.trim(),say:noTail(toRich(d.say))})).filter((d:any)=>d.say.length).slice(0,3);
 const steps=(Array.isArray(x?.steps)?x.steps:[]).map((s:any)=>noMark(noTail(toRich(s)))).filter((r:Rich)=>r.length).slice(0,3);
 const headline=x?.headline&&!Array.isArray(x.headline)&&typeof x.headline==='object'?join(toRich(x.headline.situation),toRich(x.headline.action)):toRich(x?.headline);
 const cheer=x?.cheer&&!Array.isArray(x.cheer)&&typeof x.cheer==='object'?join(toRich(x.cheer.praise),noTail(toRich(x.cheer.ask))):toRich(x?.cheer);
 const judgment=(Array.isArray(x?.judgment)?x.judgment:[]).map((j:any)=>j&&typeof j==='object'&&!Array.isArray(j)&&('a' in j||'b' in j)?(()=>{const a=opt(j.a,'①'),b=opt(j.b,'②');return a.length&&b.length?join(j.topic?[{v:String(j.topic).trim()+':'}]:[],a,b):[]})():toRich(j)).filter((r:Rich)=>r.length);
 const list=(v:unknown)=>Array.isArray(v)?v.map(toRich).filter(r=>r.length):[];
 // 개수 상한: 주제 3·강점 2·챙길 곳 3·판단 2·다음 주 2(화면 한 번에 읽히는 양)
 return {headline,cheer:clean(cheer),themes:(Array.isArray(x?.themes)?x.themes:[]).slice(0,2).filter((t:any)=>t&&typeof t.title==='string').map((t:any)=>({title:t.title,status:typeof t.status==='string'?t.status:'',summary:toRich(t.summary),evidence:Array.isArray(t.evidence)?t.evidence.filter((e:unknown)=>typeof e==='string').slice(0,3):[],targets:Array.isArray(t.targets)?t.targets.filter((e:unknown)=>typeof e==='string').slice(0,4):[]})),
  flow:toRich(x?.flow),strengths:list(x?.strengths).slice(0,2),focus:(Array.isArray(x?.focus)?x.focus:[]).slice(0,3).filter((f:any)=>f&&typeof f.name==='string').map((f:any)=>({name:f.name,reason:stripPath(toRich(f.reason))})),story:toRich(x?.story),judgment:judgment.slice(0,1),directive,steps,watch:list(x?.watch).slice(0,2),confidence:typeof x?.confidence==='string'?x.confidence:''};
}
