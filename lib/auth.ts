import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import type { User } from './types';
export const hashToken=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function currentUser():Promise<User|null> {
  const token=(await cookies()).get('lab_session')?.value;
  if(!token) return null;
  const r=await db.query(`SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true`,[hashToken(token)]);
  return r.rows[0]??null;
}
export class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
export async function requireAdmin() { const u=await currentUser(); if(!u) throw new HttpError(401,'请先登录'); if(u.role!=='admin') throw new HttpError(403,'需要管理员权限'); return u; }
export function checkOrigin(req:Request) {
  const origin=req.headers.get('origin');
  const expected=process.env.APP_ORIGIN || new URL(req.url).origin;
  if(!origin || origin!==expected) throw new HttpError(403,'请求来源无效');
}
export async function createSession(userId:string) {
  const token=randomBytes(32).toString('base64url');
  await db.query('DELETE FROM sessions WHERE expires_at<now()');
  await db.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval \'12 hours\')',[hashToken(token),userId]);
  (await cookies()).set('lab_session',token,{httpOnly:true,secure:process.env.COOKIE_SECURE==='true',sameSite:'lax',path:'/',maxAge:43200});
}
