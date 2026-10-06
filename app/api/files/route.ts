import { randomUUID } from 'node:crypto';
import { mkdir,writeFile,unlink } from 'node:fs/promises';
import { z } from 'zod';
import { db } from '@/lib/db';
import { checkOrigin,requireAdmin,HttpError } from '@/lib/auth';
import { getDevice } from '@/lib/repository';
import { errorResponse } from '@/lib/http';
import { boundedForm,detectFile,MAX_UPLOAD,uploadRoot,storagePath } from '@/lib/uploads';
export const runtime='nodejs';
export async function POST(req:Request){try{
  checkOrigin(req);const admin=await requireAdmin();const form=await boundedForm(req);const file=form.get('file');if(!(file instanceof File)||!file.size)throw new HttpError(400,'请选择文件');if(file.size>MAX_UPLOAD)throw new HttpError(413,'文件超过20MB限制');
  const kind=z.enum(['photo','manual','contract','invoice','other','logo']).parse(form.get('kind'));
  let visibility=z.enum(['public','internal']).parse(form.get('visibility'));
  const deviceId=kind==='logo'?null:z.string().regex(/^[a-z0-9]{12}$/).parse(form.get('deviceId'));
  if(deviceId&&!await getDevice(deviceId,admin))throw new HttpError(404,'设备不存在');
  const bytes=Buffer.from(await file.arrayBuffer());const mime=detectFile(bytes);if(!mime)throw new HttpError(400,'只接受PDF、PNG、JPEG或WebP文件，请将纸质或其他文档转为PDF');
  if((kind==='photo'||kind==='logo')&&!mime.startsWith('image/'))throw new HttpError(400,'设备照片与标识必须为图片');
  if(kind==='contract'||kind==='invoice')visibility='internal';if(kind==='logo')visibility='public';
  const id=randomUUID(),storageKey=id;await mkdir(uploadRoot(),{recursive:true});await writeFile(storagePath(storageKey),bytes,{flag:'wx'});
  try{await db.query('INSERT INTO attachments(id,device_id,name,kind,visibility,mime,size,storage_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,deviceId,file.name.slice(0,200),kind,visibility,mime,file.size,storageKey]);}catch(e){await unlink(storagePath(storageKey));throw e;}
  return Response.json({id},{status:201});
}catch(e){return errorResponse(e);}}
