import { z } from 'zod';
import { requireAdmin,HttpError } from '@/lib/auth';
import { getDevice,getSettings } from '@/lib/repository';
import { labelSvg,labelsPdf } from '@/lib/labels';
import { errorResponse } from '@/lib/http';
export const runtime='nodejs';
export async function GET(req:Request){try{
  const user=await requireAdmin();const q=new URL(req.url).searchParams;const ids=z.array(z.string().regex(/^[a-z0-9]{12}$/)).min(1).max(100).parse((q.get('ids')||'').split(','));const format=z.enum(['svg','pdf','a4']).parse(q.get('format')||'svg');const preview=q.get('preview')==='1';
  if(format==='svg'&&ids.length!==1)throw new HttpError(400,'单张SVG只接受一台设备');
  const s=await getSettings();if(!preview&&(!s.baseUrl||!s.scanVerifiedAt))throw new HttpError(409,'正式标签尚未启用，请先设置公网域名并完成手机扫码验证');
  const devices=await Promise.all(ids.map(id=>getDevice(id,user)));if(devices.some(d=>!d))throw new HttpError(404,'部分设备不存在');
  if(!preview&&devices.some(d=>!d!.published||d!.isDemo))throw new HttpError(400,'正式标签仅适用于已发布的真实设备');
  const labelSettings=preview&&!s.baseUrl&&process.env.LABEL_PREVIEW_BASE_URL?{...s,baseUrl:process.env.LABEL_PREVIEW_BASE_URL}:s;
  let svgs:string[];try{svgs=await Promise.all(devices.map(d=>labelSvg(d!,labelSettings,preview)));}catch(e){throw new HttpError(400,(e as Error).message);}
  const headers={'Cache-Control':'private, no-store','Content-Disposition':`attachment; filename="${preview?'preview-':''}labels.${format==='svg'?'svg':'pdf'}"`};
  if(format==='svg')return new Response(svgs[0],{headers:{...headers,'Content-Type':'image/svg+xml'}});
  return new Response(new Uint8Array(await labelsPdf(svgs,format==='a4')),{headers:{...headers,'Content-Type':'application/pdf'}});
}catch(e){return errorResponse(e);}}
