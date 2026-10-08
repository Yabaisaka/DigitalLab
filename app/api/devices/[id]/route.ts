import { z } from 'zod';
import { currentUser, requireAdmin, checkOrigin, HttpError } from '@/lib/auth';
import { getDevice, listAttachments, saveDevice } from '@/lib/repository';
import { deviceSchema } from '@/lib/validation';
import { errorResponse, jsonBody } from '@/lib/http';
import { db } from '@/lib/db';
import { unlink } from 'node:fs/promises';
import { storagePath } from '@/lib/uploads';
type Context={params:Promise<{id:string}>};
export async function GET(_:Request,ctx:Context){try{const {id}=await ctx.params;const user=await currentUser();const device=await getDevice(id,user);if(!device)throw new HttpError(404,'未找到设备');return Response.json({device,attachments:await listAttachments(id,user)},{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function PUT(req:Request,ctx:Context){try{checkOrigin(req);await requireAdmin();const {id}=await ctx.params;const body=await jsonBody(req);const revision=z.number().int().positive().parse(body.revision);const data=deviceSchema.parse(body);return Response.json({id:await saveDevice(data,id,revision)});}catch(e){return errorResponse(e);}}
export async function DELETE(req:Request,ctx:Context){try{
  checkOrigin(req);await requireAdmin();const {id}=await ctx.params;
  const body=z.object({revision:z.number().int().positive(),confirmationCode:z.string().trim().min(1).max(40)}).parse(await jsonBody(req));
  const client=await db.connect();let keys:string[]=[];
  try{
    await client.query('BEGIN');const result=await client.query('SELECT code,revision FROM devices WHERE id=$1 FOR UPDATE',[id]);const device=result.rows[0];
    if(!device)throw new HttpError(404,'设备不存在');
    if(device.revision!==body.revision)throw new HttpError(409,'档案已更新，请刷新后重新确认删除');
    if(device.code!==body.confirmationCode)throw new HttpError(400,'确认编号与设备编号不一致');
    const files=await client.query('SELECT storage_key FROM attachments WHERE device_id=$1',[id]);keys=files.rows.map(f=>f.storage_key);
    await client.query('DELETE FROM devices WHERE id=$1',[id]);await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  const cleanup=await Promise.allSettled(keys.map(key=>unlink(storagePath(key)).catch(e=>{if(e.code!=='ENOENT')throw e;})));
  if(cleanup.some(r=>r.status==='rejected'))console.error('设备已删除，部分附件文件清理失败；下载入口已失效。');
  return Response.json({ok:true});
}catch(e){return errorResponse(e);}}
