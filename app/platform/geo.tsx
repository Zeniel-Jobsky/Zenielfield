'use client';
import {useEffect,useState} from 'react';
import {LocateFixed,Loader2,MapPin} from 'lucide-react';
import {type Target,type VisitGeo,autoPickMeters,nearestTargets,distanceM} from './model';
// GPS로 가장 가까운 현장·매장을 고른다. 300m 안이면 자동 선택, 아니면 가까운 3곳을 보여 준다. 위치는 방문 기록에만 남긴다.
// GPS(기기 위치) 사용 여부. 꺼 두면 방문 등록의 자동 선택·위치 기록과 마스터의 '현재 위치로 좌표 입력'을 숨긴다(주소 검색 좌표 입력은 유지).
export const GPS_ENABLED=false;
const meters=(d:number)=>d<1000?`${d}m`:`${(d/1000).toFixed(1)}km`;
export function locate():Promise<VisitGeo>{return new Promise((resolve,reject)=>{if(!window.isSecureContext)return reject(Error('위치 확인은 https 주소에서만 됩니다.'));if(!navigator.geolocation)return reject(Error('이 기기는 위치 확인을 지원하지 않습니다.'));navigator.geolocation.getCurrentPosition(p=>resolve({lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),accuracy:Math.round(p.coords.accuracy),at:new Date().toISOString(),distance:null}),e=>reject(Error(e.code===1?'위치 권한이 거부되었습니다. 브라우저 사이트 설정에서 위치를 허용해 주세요.':'현재 위치를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.')),{enableHighAccuracy:true,timeout:15000,maximumAge:30000})})}
export function GeoPick({targets,target,onPick,onGeo,auto=false}:{targets:Target[];target?:Target;onPick?:(t:Target)=>void;onGeo:(g:VisitGeo)=>void;auto?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[geo,setGeo]=useState<VisitGeo|null>(null),[near,setNear]=useState<ReturnType<typeof nearestTargets>>([]);
 async function run(){setBusy(true);setError('');try{const g=await locate(),list=nearestTargets(targets,g);setGeo(g);onGeo(g);setNear(list);if(onPick&&list[0]&&list[0].distance<=autoPickMeters)onPick(list[0].target);else if(onPick&&!list.length)setError('좌표가 등록된 현장·매장이 없습니다. 직접 선택해 주세요.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 useEffect(()=>{if(auto&&GPS_ENABLED)run()},[]);
 if(!GPS_ENABLED)return null;
 const gap=geo&&target?.lat!=null&&target?.lng!=null?distanceM(geo,{lat:target.lat,lng:target.lng}):null;
 return <div className="geo-pick wide"><button type="button" className="btn small" onClick={run} disabled={busy}>{busy?<Loader2 size={15} className="spin"/>:<LocateFixed size={15}/>}{onPick?'GPS로 지점 자동 선택':'현재 위치 기록'}</button>
  {geo&&<span className="geo-status"><MapPin size={13}/>위치 기록됨 · 정확도 ±{meters(geo.accuracy)}{gap!==null&&<> · 선택 지점까지 <b className={gap>autoPickMeters?'red-text':''}>{meters(gap)}</b></>}</span>}
  {onPick&&geo&&near.length>0&&near[0].distance>autoPickMeters&&<details className="geo-near" open><summary>{autoPickMeters}m 안에 등록된 지점이 없습니다 · 가까운 {near.length}곳 보기</summary>{near.map(n=><button type="button" key={n.target.id} onClick={()=>onPick(n.target)}>{n.target.type==='store'?n.target.siteName+' · ':''}{n.target.name}<b>{meters(n.distance)}</b></button>)}</details>}
  {error&&<p className="geo-error wide">{error} 직접 선택해 주세요.</p>}
 </div>}
type Place={name:string;address:string;roadAddress:string;category:string;lat:number;lng:number};
export function GeoFill({lat,lng}:{lat?:number|null;lng?:number|null}){
 const [v,setV]=useState({lat:lat??'',lng:lng??''}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[q,setQ]=useState(''),[places,setPlaces]=useState<Place[]>([]);
 async function search(){setBusy(true);setError('');try{const r=await fetch('/api/geo?q='+encodeURIComponent(q)),d=await r.json() as {places?:Place[];error?:string};if(!r.ok)throw Error(d.error||'검색에 실패했습니다.');setPlaces(d.places||[]);if(!d.places?.length)setError('검색 결과가 없습니다. 주소를 더 자세히 입력해 보세요.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 function choose(p:Place,el:HTMLElement){setV({lat:p.lat,lng:p.lng});setPlaces([]);const form=el.closest('form'),set=(n:string,val:string)=>{const i=form?.elements.namedItem(n) as HTMLInputElement|null;if(i&&val&&(n==='address'||!i.value))i.value=val};set('address',p.roadAddress||p.address);if(p.category)set('name',p.name)}
 return <><div className="geo-pick wide"><input className="geo-search" aria-label="매장·주소 검색" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(q.trim().length>1)search()}}} placeholder="매장명 또는 주소로 검색 (예: 이마트 성수점)"/><button type="button" className="btn small" disabled={busy||q.trim().length<2} onClick={search}>{busy?<Loader2 size={15} className="spin"/>:<MapPin size={15}/>}검색</button>{places.length>0&&<div className="geo-near">{places.map((p,i)=><button type="button" key={i} onClick={e=>choose(p,e.currentTarget)}><span>{p.name}<small> {p.roadAddress||p.address}</small></span><b>선택</b></button>)}</div>}</div>
 <label className="field"><span>위도</span><input name="lat" inputMode="decimal" value={v.lat} onChange={e=>setV({...v,lat:e.target.value})} placeholder="37.566500"/></label><label className="field"><span>경도</span><input name="lng" inputMode="decimal" value={v.lng} onChange={e=>setV({...v,lng:e.target.value})} placeholder="126.978000"/></label>
 <div className="geo-pick wide">{GPS_ENABLED&&<button type="button" className="btn small" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const g=await locate();setV({lat:g.lat,lng:g.lng})}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}><LocateFixed size={15}/>현재 위치로 좌표 입력</button>}<small>검색으로 고르면 주소와 좌표가 함께 채워집니다.</small>{error&&<p className="form-error" role="alert">{error}</p>}</div></>}
