// CSV 내려받기: Excel에서 바로 열리게 BOM·CRLF를 붙이고, 수식으로 해석될 수 있는 값(=,+,-,@로 시작)은 앞에 '를 붙인다.
export function downloadCsv(rows:unknown[][],filename:string){
 const quote=(x:unknown)=>'"'+String(x??'').replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"';
 const url=URL.createObjectURL(new Blob(['﻿'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
