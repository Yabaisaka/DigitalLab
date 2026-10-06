'use client';
import { useId,useState } from 'react';
import type { SopProfile } from '@/lib/types';
import MarkdownContent from './markdown-content';
import '@/app/sop.css';

export default function SopViewer({profiles}:{profiles:SopProfile[]}){
  const [selected,setSelected]=useState(profiles[0]?.id||'');
  const selectorId=useId();
  const profile=profiles.find(p=>p.id===selected)||profiles[0];
  if(!profile)return <div className="empty">操作步骤待补充，请联系负责人获取经核对的操作说明。</div>;
  return <>
    <div className="sop-switch"><label htmlFor={selectorId}>选择使用方式</label><select id={selectorId} value={profile.id} onChange={e=>setSelected(e.target.value)}>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><span>版本 {profile.version||'待补充'}</span></div>
    {profile.applicability&&<div className="sop-scope"><strong>适用范围</strong><MarkdownContent>{profile.applicability}</MarkdownContent></div>}
    {profile.precautions&&<div className="sop-method-notice"><strong>本方式使用前提示</strong><MarkdownContent>{profile.precautions}</MarkdownContent></div>}
    {profile.reviewNotes.length>0&&<div className="notice sop-review"><strong>待核对事项</strong><ul>{profile.reviewNotes.map((note,i)=><li key={i}>{note}</li>)}</ul></div>}
    {profile.steps.length?<ol className="sop-list">{profile.steps.map((step,i)=><li key={i}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{step.title}</h3><MarkdownContent>{step.body}</MarkdownContent></div></li>)}</ol>:<div className="empty">此使用方式的步骤待补充。</div>}
    {!!profile.sources.length&&<details className="sop-sources"><summary>依据与参考资料（{profile.sources.length}）</summary><ul>{profile.sources.map((source,i)=><li key={i}>{source.url?<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>:source.title}{source.locator&&<span> · {source.locator}</span>}</li>)}</ul></details>}
  </>;
}
