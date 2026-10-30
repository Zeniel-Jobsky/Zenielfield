import {isTone,type Tone} from './brief-shape';
export type {Tone};
// 강조 문장 트리(AST): 문장을 정규식으로 다시 읽지 않고, 만들 때부터 조각마다 의미(tone)를 붙인다.
// num = 수치(굵게), bad = 나쁜 신호(위험색), good = 좋은 신호(완료색). 색만으로 뜻을 전하지 않도록 굵기도 함께 쓴다.
export type Seg={v:string;tone?:Tone};
export type Rich=Seg[];
type Part=string|number|Seg|Rich|null|undefined|false;
export const num=(v:string|number):Seg=>({v:String(v),tone:'num'});
export const bad=(v:string):Seg=>({v,tone:'bad'});
export const good=(v:string):Seg=>({v,tone:'good'});
// 이름 조각: 만들 때 종류를 붙인다(문장을 다시 읽어 찾지 않는다)
export const site=(v:string):Seg=>({v,tone:'site'});
export const store=(v:string):Seg=>({v,tone:'store'});
export const region=(v:string):Seg=>({v,tone:'region'});
const push=(out:Rich,p:Part)=>{if(p===null||p===undefined||p===false||p==='')return;if(typeof p==='string')out.push({v:p});else if(typeof p==='number')out.push(num(p));else if(Array.isArray(p))out.push(...p);else out.push(p)};
// 태그 템플릿: rich`이행률 ${num('39%')}로 ${bad('낮습니다')}` → 조각 배열
export function rich(strings:TemplateStringsArray,...vals:Part[]):Rich{const out:Rich=[];strings.forEach((s,i)=>{push(out,s);if(i<vals.length)push(out,vals[i])});return out}
// 여러 문장을 이어 붙인다(빈 문장은 건너뜀)
export function join(parts:(Rich|false|null|undefined)[],sep=' '):Rich{const out:Rich=[];for(const p of parts){if(!p||!p.length)continue;if(out.length)out.push({v:sep});out.push(...p)}return out}
// 이름 조각 붙이기(생성 단계): tone 없는 조각만, 조회 범위의 실제 이름과 정확히 같은 글자를 site·store·region 조각으로 나눈다.
// 화면에서 문장을 다시 읽지 않도록 브리핑을 받은 직후 한 번만 쓰고 저장본에 남긴다(DC-AI-TEXT).
export function tagNames(r:Rich,names:Map<string,Tone>):Rich{if(!names.size)return r;const keys=[...names.keys()].filter(k=>k.length>1).sort((a,b)=>b.length-a.length);const out:Rich=[];
 for(const seg of r){if(seg.tone){out.push(seg);continue}let rest=seg.v;while(rest){let at=-1,hit='';for(const k of keys){const i=rest.indexOf(k);if(i>=0&&(at<0||i<at||i===at&&k.length>hit.length)){at=i;hit=k}}if(at<0){out.push({v:rest});break}if(at>0)out.push({v:rest.slice(0,at)});out.push({v:hit,tone:names.get(hit)});rest=rest.slice(at+hit.length)}}
 return out}
export const plain=(r:Rich)=>r.map(s=>s.v).join('');
// AI 응답·옛 저장본 정규화: 문자열이면 강조 없는 한 조각으로, 조각 배열이면 tone 값을 검사한다.
export function toRich(x:unknown):Rich{if(typeof x==='string')return x?[{v:x}]:[];if(!Array.isArray(x))return [];return x.filter(s=>s&&typeof s.v==='string').map(s=>({v:s.v,...(isTone(s.tone)?{tone:s.tone}:{})}))}
// 한 문장 = 인라인 컨테이너 하나. 일반 조각은 글자 그대로 넣어 목록·격자 스타일에 조각이 따로 배치되지 않게 한다.
// onName이 있으면 현장·매장 이름 조각을 그 대상으로 바로 가는 링크로 그린다(브리핑 제안 → 대상 화면).
export function RichText({r,onName}:{r:Rich;onName?:(name:string)=>void}){return <span className="rich">{r.map((s,i)=>s.tone==='num'?<b key={i} className="hi-num">{s.v}</b>:s.tone==='bad'?<em key={i} className="hi-bad">{s.v}</em>:s.tone==='good'?<em key={i} className="hi-good">{s.v}</em>:onName&&(s.tone==='site'||s.tone==='store')?<button type="button" key={i} className={'zf-ent zf-ent-link zf-ent-'+s.tone} onClick={()=>onName(s.v)}>{s.v}</button>:s.tone==='site'||s.tone==='store'||s.tone==='region'?<span key={i} className={'zf-ent zf-ent-'+s.tone}>{s.v}</span>:s.v)}</span>}
