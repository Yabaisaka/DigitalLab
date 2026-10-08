import { z } from 'zod';
import { statuses } from './types';
import { sopProfilesSchema } from './sop';
const text = z.string().trim().max(4000).default('');
const short = z.string().trim().max(200).default('');
const date = z.string().refine(v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, '日期无效').default('');
export const loanSchema = z.object({borrower:short,contact:short,borrowedAt:date,expectedReturnAt:date,returnedAt:date,notes:text}).superRefine((loan,ctx)=>{
  for(const key of ['expectedReturnAt','returnedAt'] as const)if(loan.borrowedAt&&loan[key]&&loan[key]<loan.borrowedAt)ctx.addIssue({code:'custom',path:[key],message:'归还日期不能早于借出日期'});
});
export const deviceSchema = z.object({
  name: z.string().trim().min(1, '设备名称必填').max(120), code: z.string().trim().min(1, '设备编号必填').max(40).regex(/^[\p{L}\p{N}_.-]+$/u, '编号只能包含文字、数字、点、短横线或下划线'),
  category: short, model: short, manufacturer: short, serial: short, room: short, owner: short,
  ownerPhone: short, manufacturerPhone: short, parameters: text, status: z.enum(statuses),
  published: z.boolean().default(false), isDemo: z.boolean().default(false), labelName: z.string().trim().max(36).default(''),
  labelTips: z.array(z.string().trim().max(32)).max(2).default([]), precautions: z.string().trim().max(16000).default(''),
  sopProfiles:sopProfilesSchema.default([]),
  sop: z.array(z.object({title: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(4000)})).max(50).default([]), sopVersion: short,
  purchaseDate: date, price: z.string().trim().max(30).regex(/^(?:\d{1,12}(?:\.\d{1,2})?)?$/, '价格须为非负金额').default(''),
  supplier: short, salesPhone: short, warrantyUntil: date, internalNotes: text,
  loan:loanSchema.default({borrower:'',contact:'',borrowedAt:'',expectedReturnAt:'',returnedAt:'',notes:''}),
  purchaseChannel: short,
  purchaseUrl: z.string().trim().max(2000).refine(v=>!v||(/^https?:\/\//i.test(v)&&z.url().safeParse(v).success),'请输入http或https链接').default(''),
  maintenance: z.array(z.object({id: z.string().max(100), date, kind: z.enum(['故障','维修','保养','校准']), detail: z.string().trim().min(1).max(4000), nextDate: date})).max(1000).default([])
});
// Keep the legacy email wire field; it now accepts a case-insensitive account ID too.
export const accountIdSchema = z.string().trim().min(3).max(200).refine(v=>z.email().safeParse(v).success||/^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,63}$/.test(v),'请输入邮箱或3–64位账号ID（字母、数字、点、短横线、下划线）').transform(v=>v.toLowerCase());
export const accountSchema = z.object({email: accountIdSchema, name: z.string().trim().min(1).max(60), role: z.enum(['admin','member']), password: z.string().min(6,'密码至少6位').max(128)});
export function publicBaseUrl(value: string) {
  if (!value) return '';
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.pathname !== '/' || u.search || u.hash || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname) || /(^|\.)(localhost|local|internal|test|example)(\.|$)/i.test(u.hostname)) throw new Error('请输入真实公网HTTPS域名，例如 https://lab.your-school.edu');
  return u.origin;
}
