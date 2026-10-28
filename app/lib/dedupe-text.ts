// 반복 말 정리: 음성 인식·복사 실수로 같은 단어나 구절이 연달아 들어간 것을 하나로 줄인다.
// 예) "안내문 교체 안내문 교체 요청 요청 후" → "안내문 교체 요청 후"
// 낱말 배열 위에서 앞에서부터 가장 긴 반복 구절(최대 8낱말)을 찾아 지운다. 정규식으로 문장을 다시 읽지 않는다.
// 문장 사이 반복(같은 문장 두 번)도 같은 방식으로 지워진다. 숫자·고유명사는 건드리지 않고 "연속 반복"만 지운다.
const MAX_PHRASE=8;
const key=(w:string)=>w.replace(/[.,!?·…]+$/u,'');
export function collapseRepeats(text:string):string{
 const lines=text.split('\n');
 return lines.map(line=>{
  const words=line.split(' ').filter(w=>w.length>0);
  const out:string[]=[];
  for(const w of words){
   out.push(w);
   // 방금 넣은 낱말로 끝나는 반복 구절이 있는지, 긴 구절부터 확인
   for(let n=Math.min(MAX_PHRASE,Math.floor(out.length/2));n>=1;n--){
    let same=true;
    for(let i=0;i<n;i++){if(key(out[out.length-1-i])!==key(out[out.length-1-n-i])){same=false;break}}
    if(same){const tail=out.slice(out.length-n);out.splice(out.length-2*n,2*n,...tail);break}
   }
  }
  return out.join(' ');
 }).join('\n').trim();
}
