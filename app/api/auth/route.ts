import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { db } from '@/lib/db';
import { checkOrigin, createSession, currentUser, hashToken, HttpError } from '@/lib/auth';
import { errorResponse, jsonBody } from '@/lib/http';
import { accountIdSchema } from '@/lib/validation';
export const runtime='nodejs';
export async function GET(){try{return Response.json({user:await currentUser()},{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{
  checkOrigin(req); const {email,password}=z.object({email:accountIdSchema,password:z.string().min(1).max(128)}).parse(await jsonBody(req));
  const key=hashToken(email);
  const rate=await db.query(`INSERT INTO login_attempts(key,count,window_start) VALUES($1,1,now()) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE login_attempts.count+1 END, window_start=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE login_attempts.window_start END RETURNING count`,[key]);
  if(rate.rows[0].count>10) throw new HttpError(429,'尝试次数过多，请15分钟后重试');
  const r=await db.query('SELECT * FROM users WHERE email=$1 AND active=true',[email]);
  const valid=await bcrypt.compare(password,r.rows[0]?.password_hash??'$2b$12$FvHUWvKZH6NvU2ymfMBvYOSFpKLjEz4khH93T.nWCNq85UKAoV2Ci');
  if(!r.rows[0]||!valid) throw new HttpError(401,'账号或密码错误');
  await db.query('DELETE FROM login_attempts WHERE key=$1',[key]);
  await createSession(r.rows[0].id); return Response.json({ok:true});
}catch(e){return errorResponse(e);}}
export async function DELETE(req:Request){try{checkOrigin(req);const jar=await cookies();const token=jar.get('lab_session')?.value;if(token)await db.query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(token)]);jar.delete('lab_session');return Response.json({ok:true});}catch(e){return errorResponse(e);}}
