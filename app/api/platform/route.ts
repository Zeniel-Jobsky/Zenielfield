import {env} from 'cloudflare:workers';
import {forwardPlatform} from './server';
export const GET=(req:Request)=>forwardPlatform(req,env as unknown as Record<string,unknown>);
export const POST=(req:Request)=>forwardPlatform(req,env as unknown as Record<string,unknown>);
