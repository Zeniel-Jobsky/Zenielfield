import {env} from 'cloudflare:workers';
import {assistVisit} from './server';
export const POST=(req:Request)=>assistVisit(req,env as unknown as Record<string,unknown>);
