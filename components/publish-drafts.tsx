'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Send} from 'lucide-react';
import {api,Notice} from './ui';
import type {Device} from '@/lib/types';
export default function PublishDrafts({devices}:{devices:Partial<Device>[]}){
 const router=useRouter();const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const drafts=devices.filter(d=>!d.published);
 return <div><button type="button" className="button" disabled={busy||!drafts.length} onClick={async()=>{
  if(!confirm(`发布全部 ${drafts.length} 份草稿？\n发布后访客可查看设备基本资料、负责人电话、SOP和公开附件；购买、出借和维护资料仍仅成员可见。\n此操作包含目录中的全部草稿，不受当前搜索或筛选限制。`))return;
  setBusy(true);setError('');setSuccess('');
  try{const result=await api<{published:number}>('/api/devices/publish',{method:'POST',body:JSON.stringify({devices:drafts.map(d=>({id:d.id,revision:d.revision}))})});setSuccess(`已发布 ${result.published} 份设备档案`);router.refresh();}catch(e){setError((e as Error).message);router.refresh();}finally{setBusy(false);}
 }}><Send size={16}/>{busy?'正在发布…':`一键发布草稿（${drafts.length}）`}</button><Notice message={error}/><Notice message={success} type="success"/></div>;
}
