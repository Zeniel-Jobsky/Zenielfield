// AI 표시와 작성 중 캐릭터는 제니에리 자산을 공유한다.
export const AiMark=({size=24}:{size?:number})=><img src="/brand/jerieri-chatbot.png" width={Math.max(20,size)} height={Math.max(20,size)} className="zf-ai-mark" alt="" aria-hidden="true" draggable={false}/>;

export function AiWorking({message}:{message:string}){return <div className="zeni-working" role="status"><span className="zeni-working-character"><AiMark size={44}/><b>제니에리</b></span><p className="zeni-working-bubble">{message}<span className="zeni-working-dots" aria-hidden="true"><i/><i/><i/></span></p></div>}
