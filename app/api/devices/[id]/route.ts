import { z } from 'zod';
import { currentUser, requireAdmin, checkOrigin, HttpError } from '@/lib/auth';
import { getDevice, listAttachments, saveDevice } from '@/lib/repository';
import { deviceSchema } from '@/lib/validation';
import { errorResponse, jsonBody } from '@/lib/http';
type Context={params:Promise<{id:string}>};
export async function GET(_:Request,ctx:Context){try{const {id}=await ctx.params;const user=await currentUser();const device=await getDevice(id,user);if(!device)throw new HttpError(404,'未找到设备');return Response.json({device,attachments:await listAttachments(id,user)},{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function PUT(req:Request,ctx:Context){try{checkOrigin(req);await requireAdmin();const {id}=await ctx.params;const body=await jsonBody(req);const revision=z.number().int().positive().parse(body.revision);const data=deviceSchema.parse(body);return Response.json({id:await saveDevice(data,id,revision)});}catch(e){return errorResponse(e);}}
