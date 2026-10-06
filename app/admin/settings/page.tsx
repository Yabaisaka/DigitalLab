import SettingsForm from '@/components/settings-form';
import { getSettings } from '@/lib/repository';
import { requireAdmin } from '@/lib/auth';
export default async function SettingsPage(){await requireAdmin();return <SettingsForm initial={await getSettings()}/>;}
