import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getDevice,listAttachments,listDevices } from '@/lib/repository';
import DeviceEditor from '@/components/device-editor';
export default async function EditDevice({params}:{params:Promise<{id:string}>}){const {id}=await params;const u=await requireAdmin();const d=await getDevice(id,u);if(!d)notFound();return <DeviceEditor initial={d} files={await listAttachments(id,u)} categories={(await listDevices(u)).map(d=>d.category||'')}/>;}
