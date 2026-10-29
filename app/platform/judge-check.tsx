'use client';
import {AiMark,AiWorking} from './ai-mark';
import type {Context} from './context';
import {targetOf} from './model';
import {buildJudgeInput,cleanJudgment,LEVELS,type JudgeAction,type Level,type VisitJudgment,levelLabel} from './judgment';
import {aiDownReason,callAssist} from './ai-assist';
// 입력 시 종합 판정: 백필과 같은 지시문·타임라인 형식(buildJudgeInput)으로, 그 대상의 이전 보고·조치 + 이번 보고를 보내 판정을 받는다.
// 화면은 판정을 만들지 않는다. AI가 안 되면 이유를 알리고 판정 없이(미판정) 저장한다.
export type JudgeState={key:string;judgment:VisitJudgment|null;note:string};
type Report={purpose:string;detail:string;notes:string;result:string;actualDate:string|null};
export const judgeKey=(r:Report)=>[r.purpose,r.detail,r.notes,r.result,r.actualDate].join('\u0001');
const NEW='__new';
export async function runJudge(c:Context,targetId:string,visitId:string|null,r:Report,pending:{type:string;content:string;dueDate:string}[]=[]):Promise<JudgeState>{
 const key=judgeKey(r);
 if(c.demo!==false)return {key,judgment:null,note:'데모에서는 AI 판정을 하지 않습니다. 판정 없이 저장됩니다.'};
 const down=aiDownReason();if(down)return {key,judgment:null,note:`AI 판정을 못 했습니다(${down}). 판정 없이 저장되고 나중에 다시 판정합니다.`};
 const visits=[...c.data.visits.filter(v=>v.status==='completed'&&v.id!==visitId&&targetOf(v)===targetId),{id:NEW,...r}];
 const actions:JudgeAction[]=[...c.data.actions.filter(a=>targetOf(a)===targetId).map(a=>({...a,visitId:a.visitId===visitId?NEW:a.visitId})),...pending.map(p=>({...p,visitId:NEW,createdDate:c.now,completedDate:null}))];
 const {payload,refs}=buildJudgeInput([{visits,actions}],c.now);const ref=[...refs].find(([,id])=>id===NEW)?.[0];
 try{const d=await callAssist({text:JSON.stringify(payload),images:[],mode:'judge'});
  const hit=(d.draft?.results||[]).find((x:{ref:string})=>x.ref===ref),j=hit&&cleanJudgment({...hit,by:'ai',model:d.model,at:d.generatedAt});
  return j?{key,judgment:j,note:''}:{key,judgment:null,note:'AI 판정 응답에 이번 보고가 없습니다. 판정 없이 저장되고 나중에 다시 판정합니다.'}}
 catch(e){return {key,judgment:null,note:`AI 판정을 못 했습니다(${(e as Error).message}). 판정 없이 저장되고 나중에 다시 판정합니다.`}}
}
// 저장할 판정: 입력자가 보고 저장했으므로 확정(ai+person). 수준을 바꿨으면 바꾼 값.
export const confirmed=(s:JudgeState|null):VisitJudgment|null=>s?.judgment?{...s.judgment,by:'ai+person'}:null;
const levelClass:Record<Level,string>={정상:'ok',관찰:'watch',주의:'watch',위험:'warn'};
export function JudgeCheck({state,busy,onLevel}:{state:JudgeState|null;busy:boolean;onLevel:(l:Level)=>void}){
 if(busy)return <div className="judge-check wide"><AiWorking message="이전 보고와 후속 조치를 함께 살펴보고 있어요"/></div>;
 if(!state)return null;
 const j=state.judgment;
 if(!j)return <div className="judge-check wide"><p className="judge-note" role="status">{state.note}</p></div>;
 return <div className="judge-check wide" role="group" aria-label="AI 종합 판정">
  <div className="judge-head"><AiMark/><b>AI 종합 판정</b><span className={'judge-level '+levelClass[j.level]}>{levelLabel(j.level)}</span>
   <label className="judge-pick"><span>수준</span><select value={j.level} onChange={e=>onLevel(e.target.value as Level)}>{LEVELS.map(l=><option key={l} value={l}>{levelLabel(l)}</option>)}</select></label></div>
  <p className="judge-text">{j.assessment}</p>
  {j.issues.length>0&&<ul className="judge-issues">{j.issues.map((i,n)=><li key={n}><span>{i.type}</span><span>{i.severity}</span><span className={i.flow==='악화'?'risk':i.flow==='해결'?'ok':''}>{i.flow}</span>{i.customerRequest&&<span>고객사 요청</span>}<em>{i.summary}</em></li>)}</ul>}
  <small>판정을 확인하고 다시 저장을 누르세요. 내용을 고치면 다음 저장 때 다시 판정합니다.</small>
 </div>;
}
