import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin,checkOrigin,HttpError } from '@/lib/auth';
import { boundedForm } from '@/lib/uploads';
import { importTemplate,parseImport } from '@/lib/import';
import { deviceSchema } from '@/lib/validation';
import { errorResponse,jsonBody } from '@/lib/http';
export const runtime='nodejs';
export async function GET(){try{await requireAdmin();return new Response(await importTemplate(),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="devices-template.xlsx"','Cache-Control':'private, no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{
  checkOrigin(req);await requireAdmin();
  if(req.headers.get('content-type')?.includes('multipart/form-data')){const f=await boundedForm(req,2*1024*1024);const file=f.get('file');if(!(file instanceof File)||!file.name.endsWith('.xlsx'))throw new HttpError(400,'请上传.xlsx文件（最大2MB）');let rows;try{rows=await parseImport(Buffer.from(await file.arrayBuffer()));}catch(e){throw new HttpError(400,`无法读取工作簿：${(e as Error).message}`);}const codes=rows.flatMap(r=>r.data?[r.data.code]:[]);const existing=await db.query('SELECT code FROM devices WHERE code=ANY($1::text[])',[codes]);const seen=new Set(existing.rows.map(r=>r.code));for(const r of rows)if(r.data&&seen.has(r.data.code))r.errors.push('此编号已存在');return Response.json({rows});}
  const b=z.object({rows:z.array(deviceSchema).min(1).max(200)}).parse(await jsonBody(req));const client=await db.connect();try{await client.query('BEGIN');for(const data of b.rows){await client.query('INSERT INTO devices(id,code,data) VALUES($1,$2,$3)',[randomBytes(6).toString('hex'),data.code,JSON.stringify({...data,published:false,isDemo:false})]);}await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}return Response.json({count:b.rows.length});
}catch(e){return errorResponse(e);}}
