import type { Metadata } from 'next';
import Shell from '@/components/shell';
import { currentUser } from '@/lib/auth';
import { getSettings } from '@/lib/repository';
import './globals.css';
import './accounts.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:{default:'DigitalLab · 实验室设备档案',template:'%s · DigitalLab'},description:'实验室设备资料、操作SOP与原装说明书'};
export default async function RootLayout({children}:{children:React.ReactNode}){
  const [user,settings]=await Promise.all([currentUser(),getSettings()]);
  return <html lang="zh-CN"><body><Shell user={user} labName={settings.labName} logoId={settings.logoId}>{children}</Shell></body></html>;
}
