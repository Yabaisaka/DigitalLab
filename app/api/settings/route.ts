import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { checkOrigin, currentUser, requireAdmin, HttpError } from '@/lib/auth';
import { getSettings,setSettings } from '@/lib/repository';
import { errorResponse, jsonBody } from '@/lib/http';
import { publicBaseUrl } from '@/lib/validation';
import { db } from '@/lib/db';
export async function GET(){try{const s=await getSettings();const u=await currentUser();return Response.json(u?.role==='admin'?s:{labName:s.labName,contact:s.contact,logoId:s.logoId},{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function PUT(req:Request){try{
  checkOrigin(req);await requireAdmin();const b=z.object({labName:z.string().trim().min(1).max(32),contact:z.string().trim().max(200),baseUrl:z.string().max(200),logoId:z.string().max(40)}).parse(await jsonBody(req));
  let baseUrl:string;try{baseUrl=publicBaseUrl(b.baseUrl);}catch(e){throw new HttpError(400,(e as Error).message);}
  if(b.logoId){const r=await db.query("SELECT id FROM attachments WHERE id=$1 AND kind='logo'",[b.logoId]);if(!r.rows.length)throw new HttpError(400,'标识图片无效');}
  const old=await getSettings();const changed=old.baseUrl!==baseUrl;const s={...old,...b,baseUrl,scanToken:changed||!old.scanToken?randomBytes(24).toString('hex'):old.scanToken,scanVerifiedAt:changed?'':old.scanVerifiedAt};
  await setSettings(s);return Response.json(s);
}catch(e){return errorResponse(e);}}
