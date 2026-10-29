// 목록 도우미: 화면마다 같은 중복 제거·색인을 다시 만들지 않는다.
export const uniq=<T,>(arr:T[])=>[...new Set(arr)];
// id가 같은 행은 마지막 것 하나만
export const uniqueById=<T extends {id:string}>(rows:T[])=>[...new Map(rows.map(r=>[r.id,r])).values()];
export const byId=<T extends {id:string}>(rows:T[])=>new Map(rows.map(r=>[r.id,r] as [string,T]));
