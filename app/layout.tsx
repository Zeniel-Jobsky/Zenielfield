import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'ZeniField · 현장 운영 통합관리',description:'현장 방문 계획부터 실행, 결과, 후속 조치까지. 현장 관리의 흐름을 한눈에 확인하세요.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
