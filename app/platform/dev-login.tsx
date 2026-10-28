'use client';
// 로컬 개발 서버 전용: 시드된 역할별 테스트 계정(@example.test)으로 로그인한다. 배포 환경에서는 렌더링하지 않는다.
const accounts=[['시스템 관리자','admin'],['사업부장','director'],['팀장 · 인재사업1팀','lead1'],['팀장 · 인재사업2팀','lead2'],['팀장 · SE운영팀','lead3'],['파트장 · 인재사업1팀 A','partlead1'],['파트장 · 인재사업1팀 B','partlead2'],['잡매니저 · 김서준 (JM-001)','jm-001'],['잡매니저 · 장유나 (JM-018)','jm-018'],['잡매니저 · 배민준 (JM-021, SE)','jm-021']];
export function DevLogin(){if(!import.meta.env.DEV)return null;const go=(id:string)=>`/signin-with-chatgpt?as=${encodeURIComponent(id+'@example.test')}&return_to=${encodeURIComponent('/')}`;
 return <div className="dev-login"><b>개발용 테스트 계정으로 로그인</b><small>운영 DB에 시드된 HR-biz 가상 계정입니다. 실제 이메일 계정은 이 목록에 없습니다.</small><div>{accounts.map(([label,id])=><a key={id} className="btn small" href={go(id)}>{label}</a>)}</div><a className="textbtn" href="/signout-with-chatgpt?return_to=%2F">로그아웃</a></div>}
