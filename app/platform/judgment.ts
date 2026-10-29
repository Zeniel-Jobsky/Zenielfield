// 방문 보고 종합 판정: 보고 한 건을 따로 떼어 있음/없음을 가르지 않고, 그 대상(현장·매장)의 이전 보고·판정·연결 조치·조치 상태를 함께 보고
// "지금 이 대상이 어떤 상황인가"를 LLM이 판단해 방문 기록(data.judgment)에 저장한다. 사람이 확인·수정해 확정할 수 있다.
// 화면·브리핑은 보고 본문을 빈도·키워드로 다시 추측하지 않고 이 판정만 집계한다.
export const ISSUE_TYPES=['정기 운영점검','운영 변경·계약 협의','채용·인력충원','비품·유니폼 관리','신규 투입·온보딩','서비스 품질·응대','시설·안전 점검','행사·프로모션','근태·근무표','직원 소통·고충','교육·업무매뉴얼','운영 실적·정산 협의','이슈 재방문·후속 점검','고객사 미팅·요청','기타'] as const;
export const SEVERITIES=['긴급','보통','관찰'] as const;
export const FLOWS=['신규','지속','악화','해결'] as const;
export const LEVELS=['정상','관찰','주의','위험'] as const;
export type IssueType=typeof ISSUE_TYPES[number];
export type Severity=typeof SEVERITIES[number];
export type Flow=typeof FLOWS[number];
export type Level=typeof LEVELS[number];
// 화면 이름(저장값은 그대로): 경보·질책 대신 할 일로 읽히게 한다. 순위·빨강은 쓰지 않는다(빨강은 기한 초과 사실에만).
export const LEVEL_LABEL:Record<string,string>={정상:'정상',관찰:'지켜보기',주의:'조치 필요',위험:'바로 확인'};
export const levelLabel=(l:string)=>LEVEL_LABEL[l]||l;
export type JudgedIssue={type:IssueType;summary:string;severity:Severity;flow:Flow;customerRequest:boolean};
// level: 이 방문 시점의 대상 상황 종합 수준. assessment: 근거를 담은 종합 판단 한 문장. issues: 판단의 근거가 된 이슈(해결된 것도 flow='해결'로 남김).
export type VisitJudgment={level:Level;assessment:string;issues:JudgedIssue[];by:'ai'|'person'|'ai+person';model:string;at:string;confirmedBy:string|null};

// AI 응답 스키마: 대상 여러 곳의 타임라인을 한 번에 받아 보고(ref)마다 판정을 돌려준다.
const issueSchema={type:'object',additionalProperties:false,required:['type','summary','severity','flow','customerRequest'],properties:{type:{type:'string',enum:[...ISSUE_TYPES]},summary:{type:'string'},severity:{type:'string',enum:[...SEVERITIES]},flow:{type:'string',enum:[...FLOWS]},customerRequest:{type:'boolean'}}};
export const judgeSchema={type:'object',additionalProperties:false,required:['results'],properties:{results:{type:'array',items:{type:'object',additionalProperties:false,required:['ref','level','assessment','issues'],properties:{ref:{type:'string'},level:{type:'string',enum:[...LEVELS]},assessment:{type:'string'},issues:{type:'array',items:issueSchema}}}}}};
export const judgePrompt=()=>`너는 현장·매장 운영 관리자다. 대상(현장·매장)별로 시간순 방문 보고와 연결 조치(내용·상태·기한)를 받는다.
보고(ref)마다 "그 방문 시점에 이 대상이 어떤 상황인가"를 종합적으로 판단한다. 보고 한 건의 문구만 보지 말고 같은 대상의 앞선 보고·조치 흐름과 함께 본다.
- 시점: 각 보고는 그 보고 날짜(date) 기준으로 판단한다. 그 날짜 이후에 일어난 일(뒤 보고, 그 뒤의 조치 완료)은 쓰지 않는다. 조치는 등록일·기한·완료일로 그 날짜의 상태를 계산한다(완료일이 그 날짜 이후거나 미완료이면 그날은 미완료, 기한이 그날보다 앞이면 기한 초과). today는 오늘 날짜다.
- 결과 칸(특이사항 없음/후속 조치 필요)은 입력자 표시일 뿐이다. 판단 근거로 삼지 말고 내용·조치·흐름으로 판단한다.
- 같은 문장이 여러 대상에 나와도 형식 문장으로 치부하지 않는다. 그 대상의 맥락에서 판단한다.
- issues: 판단의 근거가 된 이슈. 요청·위험·불만·누락·지연·공백 등 누군가 확인·결정·조치할 일. 이전 보고의 이슈가 이번에 해소되었으면 flow='해결'로 남긴다. 이전에 있던 이슈가 이어지면 '지속', 더 나빠지면 '악화', 처음이면 '신규'. 이슈가 없으면 [].
- type은 방문 목적이 아니라 이슈의 성격: 채용·인력충원=인원 부족·공백·추가 인력 / 근태·근무표=근무표·교대·출퇴근·일정 전달 / 교육·업무매뉴얼=절차 안내·재교육·구버전 문서 / 시설·안전 점검=통로·적치물·장비·케이블·동선 / 비품·유니폼 관리=소모품·비품·유니폼 / 서비스 품질·응대=고객 응대·안내 품질 / 직원 소통·고충=직원 불만·공지 누락 / 운영 변경·계약 협의=운영시간·범위·계약 변경 / 운영 실적·정산 협의=실적·정산·보고 수치 / 행사·프로모션=행사 준비·물품·운영 / 신규 투입·온보딩=신규 인력 적응 / 고객사 미팅·요청=고객사 요청 회신·협의 / 이슈 재방문·후속 점검=이전 이슈 확인 자체 / 정기 운영점검=그 밖의 점검 미흡. 사람 수 부족은 채용·인력충원, 일정·교대 조정은 근태·근무표를 우선한다.
- severity: 긴급=안전·법규·계약 위험이나 당장 운영 차질 / 보통=이미 일어나 기한 안에 조치가 필요 / 관찰=가능성·우려·예정처럼 아직 일어나지 않았거나 지켜볼 일.
- level(대상 상황 종합): 정상=확인할 일 없음 또는 모두 해결 / 관찰=관찰 이슈만 / 주의=조치가 필요한 이슈가 있음(기한 안) / 위험=긴급 이슈, 악화, 기한을 넘긴 미완료 조치가 반복되는 경우.
- assessment: 판단과 근거를 한 문장(60자 안팎). 예: "인력 공백이 2회째 이어지고 대체 인력 조치가 기한을 넘겨 주의가 필요해요". 말투는 해요체. 사람 이름·연락처 금지.
- 같은 내용·같은 흐름이면 같은 판단을 한다. results는 받은 보고 수와 같게, ref는 받은 값 그대로.`;

const str=(x:unknown,n:number)=>typeof x==='string'?x.trim().slice(0,n):'';
const pick=<T extends string>(list:readonly T[],v:unknown,dflt:T):T=>(list as readonly string[]).includes(v as string)?v as T:dflt;
// 저장·응답 값 정리: 모르는 값은 기본값으로, 요약 없는 이슈는 버린다.
export function cleanIssues(x:unknown):JudgedIssue[]{
 if(!Array.isArray(x))return [];
 return x.slice(0,8).flatMap(i=>{if(!i||typeof i!=='object')return [];const o=i as Record<string,unknown>,summary=str(o.summary,120);if(!summary)return [];
  return [{type:pick(ISSUE_TYPES,o.type,'기타'),summary,severity:pick(SEVERITIES,o.severity,'보통'),flow:pick(FLOWS,o.flow,'신규'),customerRequest:o.customerRequest===true}]});
}
// 현재 형식(level·issues 배열)인가. 옛 있음/없음 형식(has/items)을 걸러 낼 때 쓴다.
export const isCurrentJudgment=(x:unknown):x is VisitJudgment=>!!x&&typeof x==='object'&&(LEVELS as readonly string[]).includes((x as Record<string,unknown>).level as string)&&Array.isArray((x as Record<string,unknown>).issues);
export function cleanJudgment(x:unknown):VisitJudgment|null{
 if(!x||typeof x!=='object')return null;const o=x as Record<string,unknown>,issues=cleanIssues(o.issues),assessment=str(o.assessment,200);
 if(!assessment&&!issues.length&&!(LEVELS as readonly string[]).includes(o.level as string))return null;
 const by=o.by==='person'||o.by==='ai+person'?o.by:'ai';
 return {level:pick(LEVELS,o.level,'관찰'),assessment,issues,by,model:str(o.model,80),at:str(o.at,40),confirmedBy:str(o.confirmedBy,100)||null};
}
// 미해결 이슈(해결 제외)가 있는가 — 집계용 파생값. 판정 자체는 level·assessment가 중심이다.
export const openIssues=(j:VisitJudgment|null|undefined)=>(j?.issues||[]).filter(i=>i.flow!=='해결');
// 보고 한 건을 타임라인 한 줄로(개인정보 마스킹은 호출하는 쪽에서).
export const reportText=(v:{purpose?:string;result?:string;detail?:string;notes?:string},actions:string[]=[])=>[v.purpose&&`목적: ${v.purpose}`,v.result&&`결과 칸: ${v.result}`,v.detail&&`상세: ${v.detail}`,v.notes&&`특이사항: ${v.notes}`,...actions.map(a=>`연결 조치: ${a}`)].filter(Boolean).join(' / ');
// 개인정보 가림: 전화·메일. AI에 보내는 모든 판정 입력에 같은 규칙을 쓴다.
export const maskText=(s:unknown)=>String(s||'').replace(/\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}/g,'(연락처)').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,'(메일)').replace(/\s+/g,' ').trim();
// 판정 입력 만들기(백필·입력 공용): 대상별 시간순 보고 + 보고에 연결된 조치(등록·기한·완료일). 상태는 날짜로만 준다(그 보고 시점 기준으로 계산하게).
export type JudgeVisit={id:string;actualDate:string|null;purpose?:string;result?:string;detail?:string;notes?:string};
export type JudgeAction={visitId:string|null;type:string;content:string;createdDate?:string|null;dueDate:string;completedDate?:string|null};
export const actionLine=(a:Omit<JudgeAction,'visitId'>)=>`[${a.type}] ${a.content} (등록 ${a.createdDate||'-'} · 기한 ${a.dueDate} · ${a.completedDate?'완료 '+a.completedDate:'미완료'})`;
export function buildJudgeInput(targets:{visits:JudgeVisit[];actions:JudgeAction[]}[],today:string){
 const refs=new Map<string,string>();let k=0;
 const payload={today,targets:targets.map((t,ti)=>{const byVisit=new Map<string,string[]>();for(const a of t.actions)if(a.visitId)byVisit.set(a.visitId,[...(byVisit.get(a.visitId)||[]),actionLine(a)]);
  return {target:'대상'+(ti+1),timeline:[...t.visits].filter(v=>v.actualDate).sort((a,b)=>a.actualDate!.localeCompare(b.actualDate!)).map(v=>{const ref=String(++k);refs.set(ref,v.id);return {ref,date:v.actualDate,report:maskText(reportText(v,byVisit.get(v.id)||[])).slice(0,900)}})}})};
 return {payload,refs};
}
