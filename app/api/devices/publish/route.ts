import {z} from 'zod';
import {checkOrigin,requireAdmin,HttpError} from '@/lib/auth';
import {db} from '@/lib/db';
import {errorResponse,jsonBody} from '@/lib/http';
const schema=z.object({devices:z.array(z.object({id:z.string().regex(/^[a-z0-9]{12}$/),revision:z.number().int().positive()}).strict()).min(1).max(200)}).strict().refine(v=>new Set(v.devices.map(d=>d.id)).size===v.devices.length,'设备不能重复');
export async function POST(req:Request){try{
 checkOrigin(req);await requireAdmin();const {devices}=schema.parse(await jsonBody(req));
 const client=await db.connect();let count=0;
 try{
  await client.query('BEGIN');const rows=await client.query('SELECT id,revision,data FROM devices WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[devices.map(d=>d.id)]);
  if(rows.rows.length!==devices.length)throw new HttpError(409,'部分设备已删除，请刷新目录后重新发布');
  const versions=new Map(devices.map(d=>[d.id,d.revision]));
  if(rows.rows.some(d=>!d.data.published&&d.revision!==versions.get(d.id)))throw new HttpError(409,'部分草稿已被修改，请刷新目录后重新发布');
  const result=await client.query("UPDATE devices SET data=jsonb_set(data,'{published}','true'::jsonb),revision=revision+1,updated_at=now() WHERE id=ANY($1::text[]) AND COALESCE((data->>'published')::boolean,false)=false RETURNING id",[devices.map(d=>d.id)]);
  count=result.rowCount||0;await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 return Response.json({published:count});
}catch(e){return errorResponse(e);}}
