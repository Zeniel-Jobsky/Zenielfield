import {type Data, type User,shift,today} from './model';
export function demoData(me?:User):Data{
 const now=today(); const admin:User=me||{id:'demo-admin',name:'관리자',email:'demo@example.test',role:'admin',team:'유통운영팀',part:'리테일파트',active:1};
 const users:User[]=[admin,...['김지훈','박서연','이민준','최유진'].map((name,i)=>({id:'demo-user-'+i,name,email:'manager'+i+'@example.test',role:'manager',team:i<3?'유통운영팀':'서비스운영팀',part:i<2?'리테일파트':i===2?'물류파트':'서비스파트',active:1}))];
 const names=['서초 리테일센터','강남 플래그십','송파 라이프몰','성수 스토어','마포 커뮤니티점','판교 물류센터','분당 리테일점','일산 서비스센터','광명 아울렛','용산 브랜드점','수원 운영센터','인천 서비스점'];
 const sites=names.map((name,i)=>({id:'demo-site-'+i,code:'ZF-'+String(i+1).padStart(3,'0'),name,client:'가상 고객사 '+String.fromCharCode(65+i),team:users[1+i%4].team,part:users[1+i%4].part,address:['서울특별시 서초구','서울특별시 강남구','서울특별시 송파구','서울특별시 성동구'][i%4]+' (가상 주소)',cycle:i%4===0?'weekly':'monthly',priority:i<3?'높음':'보통',status:'운영 중',startDate:shift(now,-30),version:1}));
 const assignments=sites.map((s,i)=>({id:'demo-as-'+i,siteId:s.id,userId:users[1+i%4].id,startDate:shift(now,-30),endDate:null}));
 const base={time:'10:00',precheck:'운영 현황 및 현장 요청사항 사전 확인',result:'',detail:'',cancelReason:'',version:1};
 const visits=sites.slice(0,10).map((s,i)=>({...base,id:'demo-visit-'+i,siteId:s.id,visitorId:users[1+i%4].id,plannedDate:shift(now,i<3?-3+i:i<6?i-3:i-6),purpose:['현장 정기점검','고객사 담당자 미팅','근로자 관리 및 면담'][i%3],actualDate:i>=6?shift(now,i-6):null,status:i>=6?'completed':'planned',result:i>=6?'후속 조치 필요':'',detail:i>=6?'[가상 시연] 현장 운영 현황과 인력 배치 확인. 담당자 요청사항을 후속 조치로 등록했습니다.':''}));
 // Completed demo visits never occur in the future.
 visits.forEach((v,i)=>{if(i>=6){v.actualDate=shift(now,-(i-6));v.plannedDate=v.actualDate}});
 const actions=sites.slice(0,5).map((s,i)=>({id:'demo-action-'+i,siteId:s.id,visitId:null,type:['인력 충원','고객사 요청','운영환경 개선'][i%3],content:['주말 운영 인력 2명 충원 검토','고객사 요청사항 확인 및 회신','휴게공간 운영 안내 보완','현장 안전교육 일정 조율','신규 투입 인력 안내자료 전달'][i],ownerId:users[1+i%4].id,dueDate:shift(now,i-2),state:i===4?'완료':i%2?'처리 중':'조치 예정',completedDate:i===4?now:null,version:1}));
 return {me:admin,users,sites,assignments,visits,actions,audit:[]};
}
