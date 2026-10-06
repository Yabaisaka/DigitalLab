import { requireAdmin,checkOrigin,HttpError } from '@/lib/auth';
import { boundedForm } from '@/lib/uploads';
import { sopDocumentSchema } from '@/lib/sop';
import { errorResponse } from '@/lib/http';
export const runtime='nodejs';
export async function POST(req:Request){try{
  checkOrigin(req);await requireAdmin();
  const form=await boundedForm(req,1024*1024+16384);const file=form.get('file');
  if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.json'))throw new HttpError(400,'请选择规范化SOP JSON文件');
  if(file.size>1024*1024)throw new HttpError(413,'SOP文件最多1MB');
  let raw:unknown;try{raw=JSON.parse((await file.text()).replace(/^\uFEFF/,''));}catch{throw new HttpError(400,'JSON格式无效，请使用下载的模板并检查逗号和引号');}
  const result=sopDocumentSchema.safeParse(raw);
  if(!result.success)throw new HttpError(400,result.error.issues.slice(0,12).map(i=>`${i.path.join('.')||'文档'}：${i.message}`).join('；'));
  return Response.json({document:result.data},{headers:{'Cache-Control':'no-store'}});
}catch(e){return errorResponse(e);}}
