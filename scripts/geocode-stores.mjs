// 주소 CSV → 좌표 CSV. 사용: node --env-file=.env scripts/geocode-stores.mjs 입력.csv [출력.csv]
// 입력 열: code,name,address (헤더 필수, UTF-8). 출력에 lat,lng,matched,status 추가.
import fs from 'node:fs';
const [input,output=input.replace(/\.csv$/i,'')+'-geo.csv']=process.argv.slice(2);const key=process.env.KAKAO_REST_API_KEY;
if(!input||!key){console.error('입력 CSV와 KAKAO_REST_API_KEY가 필요합니다.');process.exit(1)}
const parse=t=>{const rows=[];let row=[],cell='',q=false;for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'&&t[i+1]==='"'){cell+='"';i++}else if(ch==='"')q=false;else cell+=ch}else if(ch==='"')q=true;else if(ch===','){row.push(cell);cell=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=ch}if(cell||row.length){row.push(cell);rows.push(row)}return rows.filter(r=>r.some(c=>c.trim()))};
const esc=v=>/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':String(v);
const [head,...rows]=parse(fs.readFileSync(input,'utf8').replace(/^﻿/,''));const col=n=>head.indexOf(n);if(col('address')<0){console.error('address 열이 없습니다.');process.exit(1)}
const ask=async(kind,q)=>{const r=await fetch(`https://dapi.kakao.com/v2/local/search/${kind}.json?size=1&query=${encodeURIComponent(q)}`,{headers:{Authorization:'KakaoAK '+key}});if(!r.ok)throw Error('HTTP '+r.status);return (await r.json()).documents[0]};
const out=[[...head,'lat','lng','matched','status'].join(',')];let ok=0;
for(const r of rows){const address=r[col('address')]?.trim(),name=col('name')>=0?r[col('name')]?.trim():'';let d=null,status='없음';try{d=address&&await ask('address',address)||name&&await ask('keyword',name+' '+address.split(' ').slice(0,2).join(' '));status=d?'일치':'없음'}catch(e){status='오류 '+e.message}
 if(d)ok++;out.push([...r,d?(+d.y).toFixed(6):'',d?(+d.x).toFixed(6):'',d?(d.road_address_name||d.address_name||d.place_name):'',status].map(esc).join(','));await new Promise(s=>setTimeout(s,120))}
fs.writeFileSync(output,'﻿'+out.join('\n'));console.log(`${ok}/${rows.length}건 좌표 생성 → ${output}`);
