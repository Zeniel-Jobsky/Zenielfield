// 죽은 CSS 점검: 선택자의 클래스가 app·lib 소스 어디에도 없으면 죽은 규칙으로 보고한다. 사용: node scripts/css-dead.mjs <css...>
// CSS 감사: 선택자의 클래스가 소스(tsx/ts) 어디에도 없으면 죽은 규칙으로 본다(동적 접두사 'x-'+ 는 살아 있는 것으로).
import fs from 'node:fs';import path from 'node:path';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):/\.(tsx?|mts)$/.test(e.name)?[path.join(d,e.name)]:[]);
const src=[...walk('app'),...walk('lib')].map(f=>fs.readFileSync(f,'utf8')).join('\n');
const alive=c=>{if(src.includes(c))return true;const i=c.lastIndexOf('-');if(i<=0)return false;const p=c.slice(0,i+1);return ["'",'"','`',' '].some(q=>src.includes(q+p+q)||src.includes(q+p+"'")||src.includes(q+p+'`'))};
const files=process.argv.slice(2);let deadAll=0;
for(const f of files){const css=fs.readFileSync(f,'utf8');let dead=0,total=0,bytes=0;const sample=[];
 const re=/([^{}@]+)\{[^{}]*\}/g;let m;while((m=re.exec(css))){const sel=m[1].trim();if(!sel||sel.startsWith('from')||sel.startsWith('to')||/^\d+%/.test(sel))continue;total++;
  const parts=sel.split(',').map(s=>s.trim());const deadParts=parts.filter(p=>{const cls=[...p.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(x=>x[1]);return cls.length&&cls.some(c=>!alive(c))});
  if(deadParts.length===parts.length){dead++;bytes+=m[0].length;if(sample.length<6)sample.push(sel.slice(0,70))}}
 deadAll+=bytes;console.log(f,'rules',total,'dead',dead,'bytes',bytes);console.log('  e.g.',sample.join(' | '))}
console.log('dead bytes total',deadAll);
