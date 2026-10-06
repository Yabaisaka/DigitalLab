import { currentUser, requireAdmin, checkOrigin } from '@/lib/auth';
import { listDevices, saveDevice } from '@/lib/repository';
import { deviceSchema } from '@/lib/validation';
import { errorResponse, jsonBody } from '@/lib/http';
export async function GET(){try{return Response.json(await listDevices(await currentUser()),{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{checkOrigin(req);await requireAdmin();const data=deviceSchema.parse(await jsonBody(req));return Response.json({id:await saveDevice(data)},{status:201});}catch(e){return errorResponse(e);}}
