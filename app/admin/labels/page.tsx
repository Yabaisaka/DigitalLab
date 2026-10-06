import LabelsPanel from '@/components/labels-panel';
import { listDevices,getSettings } from '@/lib/repository';
import { requireAdmin } from '@/lib/auth';
import type { Device } from '@/lib/types';
export default async function LabelsPage(){return <LabelsPanel devices={await listDevices(await requireAdmin()) as Device[]} settings={await getSettings()} previewUrl={process.env.LABEL_PREVIEW_BASE_URL||''}/>;}
