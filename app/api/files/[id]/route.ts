import { readFile,unlink } from 'node:fs/promises';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser,requireAdmin,checkOrigin,HttpError } from '@/lib/auth';
import { getDevice,getSettings,setSettings } from '@/lib/repository';
import { errorResponse } from '@/lib/http';
import { storagePath } from '@/lib/uploads';
type Context={params:Promise<{id:string}>};
export async function GET(_:Request,ctx:Context){try{
  const {id}=await ctx.params;if(!z.uuid().safeParse(id).success)throw new HttpError(404,'文件不存在');
  const r=await db.query('SELECT * FROM attachments WHERE id=$1',[id]);const f=r.rows[0];const user=await currentUser();
  if(!f||f.visibility==='internal'&&!user)throw new HttpError(404,'文件不存在');
  if(f.device_id&&!await getDevice(f.device_id,user))throw new HttpError(404,'文件不存在');
  if(f.kind==='logo'&&user?.role!=='admin'&&(await getSettings()).logoId!==id)throw new HttpError(404,'文件不存在');
  const bytes=await readFile(storagePath(f.storage_key));
  return new Response(bytes,{headers:{'Content-Type':f.mime,'Content-Length':String(bytes.length),'Content-Disposition':`${['photo','logo'].includes(f.kind)?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(e){if((e as {code?:string}).code==='ENOENT')return Response.json({error:'文件缺失，请联系管理员恢复备份'},{status:404});return errorResponse(e);}}
export async function DELETE(req:Request,ctx:Context){try{checkOrigin(req);await requireAdmin();const {id}=await ctx.params;const r=await db.query('DELETE FROM attachments WHERE id=$1 RETURNING storage_key',[z.uuid().parse(id)]);if(!r.rows.length)throw new HttpError(404,'文件不存在');await unlink(storagePath(r.rows[0].storage_key)).catch(()=>{});const s=await getSettings();if(s.logoId===id)await setSettings({...s,logoId:''});return Response.json({ok:true});}catch(e){return errorResponse(e);}}
