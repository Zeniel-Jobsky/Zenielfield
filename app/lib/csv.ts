// CSV 내려받기: Excel에서 바로 열리게 BOM·CRLF를 붙이고, 수식으로 해석될 수 있는 값(=,+,-,@로 시작)은 앞에 '를 붙인다.
export function downloadCsv(rows:unknown[][],filename:string){
 const quote=(x:unknown)=>'"'+String(x??'').replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"';
 const url=URL.createObjectURL(new Blob(['﻿'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
// CSV 읽기: Excel이 저장한 파일(BOM·CRLF·따옴표·"" 이스케이프)을 줄마다 칸 배열로. 빈 줄·#로 시작하는 줄은 뺀다. 내려받을 때 붙인 수식 방지 '는 떼어 낸다.
export function parseCsv(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],cell='',q=false;const s=text.replace(/^\uFEFF/,'');
 const push=()=>{row.push(cell.trim().replace(/^'(?=[=+@-])/,''));cell=''};
 for(let i=0;i<s.length;i++){const ch=s[i];
  if(q){if(ch==='"'){if(s[i+1]==='"'){cell+='"';i++}else q=false}else cell+=ch;continue}
  if(ch==='"')q=true;else if(ch===',')push();else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&s[i+1]==='\n')i++;push();rows.push(row);row=[]}else cell+=ch}
 if(cell||row.length){push();rows.push(row)}
 return rows.filter(r=>r.some(Boolean)&&!r[0].startsWith('#'));
}
