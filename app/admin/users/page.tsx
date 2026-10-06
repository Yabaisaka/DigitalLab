import UsersPanel from '@/components/users-panel';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
export default async function UsersPage(){const user=await requireAdmin();return <UsersPanel selfId={user.id} initial={(await db.query('SELECT id,email,name,role,active FROM users ORDER BY name')).rows}/>;}
