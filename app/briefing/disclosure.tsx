import type {ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';

export function BriefDisclosure({open,controls,onClick,children}:{open:boolean;controls:string;onClick:()=>void;children:ReactNode}){
 return <button type="button" className="brief-disclosure brief-list-disclosure" aria-expanded={open} aria-controls={controls} onClick={onClick}>{children}<ChevronDown size={16} aria-hidden="true"/></button>;
}
