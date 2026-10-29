'use client';
import {useEffect,useState} from 'react';
import {Check,Loader2} from 'lucide-react';
import {BrandIdentity} from '../brand';
import {AiWorking} from './ai-mark';
// 로그인 직후 운영 데이터 로딩 화면: 단계·받은 크기·경과 시간을 보여 준다. 크기를 알면 진행 막대, 모르면 흐르는 막대.
export type LoadPhase='auth'|'fetch'|'render';
export type LoadInfo={phase:LoadPhase;received:number;total:number|null;startedAt:number};
const kb=(n:number)=>n<1024*1024?Math.max(1,Math.round(n/1024))+'KB':(n/1024/1024).toFixed(1)+'MB';
// 기다리는 동안 제니에리가 단계에 맞는 말을 차례로 건넨다(시간대 인사 + 지금 하는 일 + 다음에 보여 줄 것). 사실을 지어내지 않는다.
const greet=()=>{const h=new Date().getHours();return h<11?'좋은 아침이에요':h<14?'점심 전후로 바쁘시죠':h<18?'오후도 힘내세요':'늦게까지 고생 많으세요'};
const talk:Record<LoadPhase,string[]>={auth:['로그인을 확인하고 있어요','담당 범위를 확인하고 있어요'],fetch:['현장·매장 방문 기록을 가져오고 있어요','새로 올라온 방문 보고를 모으고 있어요','기한이 다가온 후속 조치도 함께 챙기고 있어요','선택한 기간 데이터만 가볍게 받고 있어요'],render:['오늘 먼저 볼 곳을 정리하고 있어요','곧 화면을 보여 드릴게요']};
const steps:[LoadPhase,string][]=[['auth','로그인 확인'],['fetch','운영 데이터 받기'],['render','화면 준비']];
export function LoadingProgress({info}:{info:LoadInfo}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),200);return()=>clearInterval(t)},[]);
 const sec=Math.max(0,(now-info.startedAt)/1000),idx=steps.findIndex(([k])=>k===info.phase);
 const pct=info.phase==='render'?100:info.total?Math.min(99,Math.round(info.received/info.total*100)):null;
 return <main className="supabase-entry load-screen"><span className="brand"><BrandIdentity/></span>
  <section className="panel load-panel" aria-busy="true">
   <h1 className="sr-only">운영 데이터를 불러오는 중</h1>
   <AiWorking message={sec<2.4&&info.phase==='auth'?greet()+'. '+talk.auth[0]:talk[info.phase][Math.floor(sec/2.4)%talk[info.phase].length]+(info.phase==='fetch'&&info.received?` (${kb(info.received)})`:'')}/>
   <div className={'load-bar'+(pct===null?' indeterminate':'')} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct??undefined} aria-label="불러오기 진행"><i style={pct===null?undefined:{width:pct+'%'}}/></div>
   <ol className="load-steps">{steps.map(([k,label],i)=><li key={k} className={i<idx?'done':i===idx?'active':''}>{i<idx?<Check size={14}/>:i===idx?<Loader2 size={14} className="spin"/>:<span className="dot"/>}<span>{label}</span>
    {k==='fetch'&&i===idx&&<small>{info.received?kb(info.received)+(info.total?` / ${kb(info.total)}`:'')+' 받음':'서버 응답 대기'}</small>}</li>)}</ol>
   <p className="load-meta">{sec.toFixed(1)}초{sec>8&&' · 네트워크가 느리면 조금 더 걸릴 수 있어요'}</p>
  </section></main>;
}
// 응답 본문을 조금씩 읽으며 받은 크기를 알려 준다.
export async function readJsonWithProgress<T>(r:Response,onBytes:(received:number,total:number|null)=>void):Promise<T>{
 const total=Number(r.headers.get('content-length'))||null;
 if(!r.body){const t=await r.text();onBytes(t.length,total);return JSON.parse(t) as T}
 const reader=r.body.getReader(),chunks:Uint8Array[]=[];let got=0,last=0;
 for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);got+=value.length;if(got-last>32768){last=got;onBytes(got,total)}}
 onBytes(got,total);const all=new Uint8Array(got);let o=0;for(const c of chunks){all.set(c,o);o+=c.length}
 return JSON.parse(new TextDecoder().decode(all)) as T;
}
