import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { checkOrigin, requireAdmin, HttpError } from '@/lib/auth';
import { errorResponse, jsonBody } from '@/lib/http';
import { accountSchema } from '@/lib/validation';
export async function GET(){try{await requireAdmin();return Response.json((await db.query('SELECT id,email,name,role,active FROM users ORDER BY name')).rows,{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{checkOrigin(req);await requireAdmin();const b=accountSchema.parse(await jsonBody(req));await db.query('INSERT INTO users(id,email,name,role,password_hash) VALUES($1,$2,$3,$4,$5)',[randomUUID(),b.email,b.name,b.role,await bcrypt.hash(b.password,12)]);return Response.json({ok:true},{status:201});}catch(e){return errorResponse(e);}}
export async function PATCH(req:Request){try{
  checkOrigin(req);const admin=await requireAdmin();const b=z.object({id:z.uuid(),active:z.boolean().optional(),role:z.enum(['admin','member']).optional(),password:z.string().min(6).max(128).optional()}).refine(v=>v.active!==undefined||v.role!==undefined||v.password!==undefined,'请提供需要更新的内容').parse(await jsonBody(req));
  if(b.id===admin.id&&b.active===false)throw new HttpError(400,'不能停用当前管理员账号');
  if(b.id===admin.id&&b.role==='member')throw new HttpError(400,'不能取消当前账号的管理员权限');
  const passwordHash=b.password?await bcrypt.hash(b.password,12):null;
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    // Serialize privilege changes and recheck the actor after locking to avoid races.
    const locked=await client.query("SELECT id,role,active FROM users WHERE role='admin' OR id=$1 OR id=$2 ORDER BY id FOR UPDATE",[b.id,admin.id]);
    const actor=locked.rows.find(u=>u.id===admin.id),target=locked.rows.find(u=>u.id===b.id);
    if(!actor?.active||actor.role!=='admin')throw new HttpError(403,'管理员权限已变更，请重新登录');
    if(!target)throw new HttpError(404,'账号不存在');
    if(target.role==='admin'&&target.active&&(b.role==='member'||b.active===false)&&locked.rows.filter(u=>u.active&&u.role==='admin').length<=1)throw new HttpError(400,'必须保留至少一位启用的管理员');
    await client.query('UPDATE users SET active=COALESCE($1,active),password_hash=COALESCE($2,password_hash),role=COALESCE($3,role) WHERE id=$4',[b.active??null,passwordHash,b.role??null,b.id]);
    if(b.password||b.active===false||b.role&&b.role!==target.role)await client.query('DELETE FROM sessions WHERE user_id=$1',[b.id]);
    await client.query('COMMIT');
  } catch(e){await client.query('ROLLBACK');throw e;} finally{client.release();}
  return Response.json({ok:true});
}catch(e){return errorResponse(e);}}
