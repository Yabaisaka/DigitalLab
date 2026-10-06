import DeviceEditor from '@/components/device-editor';
import { requireAdmin } from '@/lib/auth';
import { listDevices } from '@/lib/repository';
export default async function NewDevice(){const user=await requireAdmin();return <DeviceEditor categories={(await listDevices(user)).map(d=>d.category||'')}/>;}
