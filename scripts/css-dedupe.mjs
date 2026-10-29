// 덮어써져 효과 없는 CSS 선언 제거. 사용: node scripts/css-dedupe.mjs <불러오는 순서대로 css...> (순서가 확실한 파일끼리만)
import fs from 'node:fs';import postcss from 'postcss';
const files=process.argv.slice(2),roots=files.map(f=>postcss.parse(fs.readFileSync(f,'utf8'),{from:f}));
const ctx=n=>{const a=[];for(let p=n.parent;p&&p.type!=='root';p=p.parent)if(p.type==='atrule')a.unshift('@'+p.name+' '+p.params.replace(/\s+/g,''));return a.join('|')};
const norm=s=>s.split(',').map(x=>x.trim().replace(/\s+/g,' ').replace(/\s*>\s*/g,'>')).sort().join(',');
const last=new Map();let removed=0;
// 뒤에서부터 훑으며, 이미 뒤에서 정해진 (조건,선택자,속성)이면 앞 선언을 지운다
for(let r=roots.length-1;r>=0;r--){const decls=[];roots[r].walkDecls(d=>{if(d.parent.type==='rule'&&!d.parent.parent?.name?.includes('keyframes'))decls.push(d)});
 for(let i=decls.length-1;i>=0;i--){const d=decls[i],k=ctx(d.parent)+'§'+norm(d.parent.selector)+'§'+d.prop;const later=last.get(k);
  if(later&&!(d.important&&!later.important)){d.remove();removed++}else if(!later)last.set(k,d)}}
for(const root of roots)root.walkRules(r=>{if(!r.nodes.length)r.remove()});for(const root of roots)root.walkAtRules(a=>{if(a.nodes&&!a.nodes.length)a.remove()});
files.forEach((f,i)=>{const before=fs.statSync(f).size;fs.writeFileSync(f,roots[i].toString());console.log(f,before,'→',fs.statSync(f).size)});
console.log('removed declarations',removed);
