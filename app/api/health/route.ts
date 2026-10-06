import { db } from '@/lib/db';
export async function GET(){try{await db.query('SELECT id FROM settings LIMIT 1');return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({ok:false},{status:503});}}
