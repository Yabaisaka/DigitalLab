'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="empty"><h1>暂时无法加载档案</h1><p>请稍后重试。如持续出现，请联系管理员检查数据库连接。</p><button className="button" onClick={reset}>重试</button></div>;}
