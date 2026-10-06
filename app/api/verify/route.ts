import { checkOrigin,requireAdmin,HttpError } from '@/lib/auth';
import { getSettings,setSettings } from '@/lib/repository';
import { errorResponse,jsonBody } from '@/lib/http';
export async function POST(req:Request){try{checkOrigin(req);await requireAdmin();const b=await jsonBody(req);const s=await getSettings();if(!s.baseUrl||b.token!==s.scanToken||req.headers.get('origin')!==s.baseUrl)throw new HttpError(400,'请在已配置的公网域名上完成扫码验证');await setSettings({...s,scanVerifiedAt:new Date().toISOString()});return Response.json({ok:true});}catch(e){return errorResponse(e);}}
