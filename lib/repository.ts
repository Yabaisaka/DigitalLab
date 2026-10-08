import { randomBytes } from 'node:crypto';
import { db } from './db';
import { defaultSettings, emptyDevice, type Device, type DeviceData, type Settings, type Attachment, type User } from './types';
type Row = { id: string; data: DeviceData; updated_at: Date; revision: number };
const fromRow = (r: Row): Device => ({...emptyDevice, ...r.data, id:r.id, revision:r.revision, updatedAt:new Date(r.updated_at).toISOString()});
export function projectDevice(d: Device, user: User | null) {
  if (user) return d;
  const {purchaseDate, price, supplier, salesPhone, warrantyUntil, purchaseChannel, purchaseUrl, internalNotes, maintenance, loan, ...safe} = d;
  void purchaseDate; void price; void supplier; void salesPhone; void warrantyUntil; void purchaseChannel; void purchaseUrl; void internalNotes; void maintenance;
  void loan;
  return safe;
}
export async function getDevice(id: string, user: User | null): Promise<Device | null> {
  const r = await db.query('SELECT * FROM devices WHERE id=$1', [id]);
  if (!r.rows.length) return null;
  const d = fromRow(r.rows[0]);
  if (!d.published && user?.role !== 'admin') return null;
  return projectDevice(d,user) as Device;
}
export async function listDevices(user: User | null) {
  const r = await db.query('SELECT * FROM devices ORDER BY code');
  return r.rows.map(fromRow).filter(d=>d.published || user?.role==='admin').map(d=>projectDevice(d,user));
}
export async function saveDevice(data: DeviceData, id?: string, revision?: number) {
  if (!id) { const newId = randomBytes(6).toString('hex'); await db.query('INSERT INTO devices(id,code,data) VALUES($1,$2,$3)',[newId,data.code,JSON.stringify(data)]); return newId; }
  const r = await db.query('UPDATE devices SET code=$1, data=$2, updated_at=now(), revision=revision+1 WHERE id=$3 AND revision=$4 RETURNING id',[data.code,JSON.stringify(data),id,revision]);
  if (!r.rows.length) throw new Error('档案已被其他人更新，请刷新后重试');
  return id;
}
export async function getSettings(): Promise<Settings> { const r=await db.query('SELECT data FROM settings WHERE id=1'); return {...defaultSettings,...r.rows[0]?.data}; }
export async function setSettings(s:Settings) { await db.query('INSERT INTO settings(id,data) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data',[JSON.stringify(s)]); }
export async function listAttachments(id:string,user:User|null):Promise<Attachment[]> {
  if (!await getDevice(id,user)) return [];
  const r=await db.query(`SELECT id,device_id AS "deviceId",name,kind,visibility,mime,size FROM attachments WHERE device_id=$1 ${user?'':"AND visibility='public'"} ORDER BY name`,[id]); return r.rows;
}
