import Link from 'next/link';
export default function NotFound(){return <div className="empty"><h1>未找到档案</h1><p>设备可能尚未发布，或链接无效。管理员可登录后查看草稿。</p><Link className="button" href="/">返回设备目录</Link></div>;}
