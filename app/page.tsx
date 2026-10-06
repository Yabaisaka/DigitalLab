import { currentUser } from '@/lib/auth';
import { listDevices } from '@/lib/repository';
import Catalog from '@/components/catalog';
export default async function Home(){const user=await currentUser();return <Catalog devices={await listDevices(user)} admin={user?.role==='admin'}/>;}
