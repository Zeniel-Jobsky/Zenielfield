import {env} from 'cloudflare:workers';
import {geoSearch} from './server';
export const GET=(req:Request)=>geoSearch(req,env as unknown as Record<string,unknown>);
