import { HttpError } from './auth';
import path from 'node:path';
// Runtime-only private volume. Never trace uploaded data into the deployment bundle.
export const uploadRoot=()=>path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR||'uploads');
export const storagePath=(key:string)=>path.join(/* turbopackIgnore: true */ uploadRoot(),key);
export const MAX_UPLOAD=20*1024*1024;
export async function boundedForm(req:Request,max=MAX_UPLOAD+65536) {
  if(Number(req.headers.get('content-length'))>max) throw new HttpError(413,'文件超过20MB限制');
  const reader=req.body?.getReader();if(!reader)throw new HttpError(400,'缺少上传内容');
  const chunks:Uint8Array[]=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw new HttpError(413,'上传内容过大');}chunks.push(value);}
  return new Response(Buffer.concat(chunks),{headers:{'Content-Type':req.headers.get('content-type')??''}}).formData();
}
export function detectFile(b:Buffer):string|null {
  if(b.subarray(0,5).toString()==='%PDF-')return 'application/pdf';
  if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
  if(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP')return 'image/webp';
  return null;
}
