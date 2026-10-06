import { z } from 'zod';
import type { DeviceData, SopProfile } from './types';

const markdown=z.string().trim().max(16000);
const short=z.string().trim().max(200);
export const sopStepSchema=z.object({title:z.string().trim().min(1).max(120),body:markdown.min(1)}).strict();
export const sopProfileSchema=z.object({
  id:z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/,'SOP标识须为1–64位小写字母、数字、短横线或下划线'),
  name:z.string().trim().min(1).max(120),version:short,
  applicability:z.string().trim().max(2000),precautions:markdown,
  steps:z.array(sopStepSchema).max(100),
  sources:z.array(z.object({title:z.string().trim().min(1).max(200),url:z.string().trim().max(2000).refine(v=>!v||(/^https?:\/\//i.test(v)&&z.url().safeParse(v).success),'来源链接须为http或https'),locator:short}).strict()).max(30),
  reviewNotes:z.array(z.string().trim().min(1).max(1000)).max(30)
}).strict();
export const sopProfilesSchema=z.array(sopProfileSchema).max(20).superRefine((profiles,ctx)=>{
  const ids=new Set<string>();const names=new Set<string>();
  profiles.forEach((p,i)=>{if(ids.has(p.id))ctx.addIssue({code:'custom',path:[i,'id'],message:'SOP标识重复'});ids.add(p.id);const name=p.name.toLowerCase();if(names.has(name))ctx.addIssue({code:'custom',path:[i,'name'],message:'SOP名称重复，请使用不同场景名称'});names.add(name);});
});
export const sopDocumentSchema=z.object({
  format:z.literal('digitallab.sop'),schemaVersion:z.literal(1),
  device:z.object({name:z.string().trim().min(1).max(120),model:short,code:z.string().trim().max(40)}).strict(),
  precautions:markdown,
  labelTips:z.array(z.string().trim().min(1).max(32).refine(v=>!/[\r\n]|\*\*|__|`|\[[^\]]*\]\(/.test(v),'标签提示须为单行纯文本，不使用Markdown')).max(2),
  sops:sopProfilesSchema.refine(v=>v.length>0,'文件至少需要一套SOP')
}).strict().superRefine((doc,ctx)=>{doc.sops.forEach((p,i)=>{if(!p.steps.length)ctx.addIssue({code:'custom',path:['sops',i,'steps'],message:'每套导入SOP至少需要一个步骤'});});});
export type SopDocument=z.infer<typeof sopDocumentSchema>;
export type SopImportMode='merge'|'replace';

export function getSopProfiles(data:Pick<DeviceData,'sopProfiles'|'sop'|'sopVersion'>):SopProfile[]{
  if(data.sopProfiles?.length)return data.sopProfiles;
  if(!data.sop?.length&&!data.sopVersion)return [];
  return [{id:'legacy-default',name:'通用操作',version:data.sopVersion||'',applicability:'',precautions:'',steps:data.sop||[],sources:[],reviewNotes:[]}];
}

export function applySopDocument(data:DeviceData,doc:SopDocument,mode:SopImportMode):DeviceData{
  if(doc.device.code&&data.code&&doc.device.code!==data.code)throw new Error(`设备编号不匹配：文件为${doc.device.code}，当前为${data.code}`);
  const existing=getSopProfiles(data);
  const incoming=new Map(doc.sops.map(p=>[p.id,p]));
  const combined=mode==='replace'?doc.sops:[...existing.map(p=>incoming.get(p.id)||p),...doc.sops.filter(p=>!existing.some(e=>e.id===p.id))];
  const profiles=sopProfilesSchema.parse(combined);
  // Keep the old wire fields empty after conversion, so deleted profiles cannot reappear.
  const next={...data,precautions:doc.precautions,labelTips:doc.labelTips,sopProfiles:profiles,sop:[],sopVersion:''};
  if(new TextEncoder().encode(JSON.stringify(next)).length>1024*1024-1024)throw new Error('导入后档案超过1MB，请缩短正文或分离附件后再导入');
  return next;
}
