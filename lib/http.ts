import { ZodError } from 'zod';
import { HttpError } from './auth';
export function errorResponse(e:unknown) {
  if(e instanceof HttpError) return Response.json({error:e.message},{status:e.status});
  if(e instanceof ZodError) return Response.json({error:e.issues.map(v=>`${v.path.join('.')}: ${v.message}`).join('；')},{status:400});
  if((e as {code?:string}).code==='23505') return Response.json({error:'编号或邮箱已存在，请使用唯一值'},{status:409});
  if(e instanceof SyntaxError) return Response.json({error:'请求格式无效'},{status:400});
  if(e instanceof Error && e.message.startsWith('档案已被')) return Response.json({error:e.message},{status:409});
  console.error('Request failed',e instanceof Error?e.message:'Unknown error');
  return Response.json({error:'操作失败，请稍后重试或联系管理员'},{status:500});
}
export async function jsonBody(req:Request) {
  const body=await req.text(); if(Buffer.byteLength(body)>1024*1024) throw new HttpError(413,'请求内容过大'); return JSON.parse(body);
}
