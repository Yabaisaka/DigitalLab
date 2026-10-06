import { redirect,notFound } from 'next/navigation';
import { getSettings } from '@/lib/repository';
import { currentUser } from '@/lib/auth';
import VerifyButton from '@/components/verify-button';
export default async function VerifyPage({params}:{params:Promise<{token:string}>}){const {token}=await params;const s=await getSettings();if(!s.baseUrl||s.scanToken!==token)notFound();const u=await currentUser();if(!u)redirect(`/login?next=/verify/${token}`);if(u.role!=='admin')return <div className="notice error">需要管理员账号确认。</div>;return <div className="panel narrow-panel"><h1>公网扫码验证</h1><p>当前配置网址：{s.baseUrl}</p><p>请确认你已在手机上扫描二维码，并成功打开此公网页面，然后启用正式标签。</p><VerifyButton token={token}/></div>;}
