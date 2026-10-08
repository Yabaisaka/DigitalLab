'use client';
import {useState} from 'react';
import {Trash2} from 'lucide-react';
import {api,Field,Notice} from './ui';
import '@/app/device-actions.css';
export default function DeleteDevice({id,code,revision,disabled,onDeleted}:{id:string;code:string;revision:number;disabled:boolean;onDeleted:()=>void}){
 const [open,setOpen]=useState(false),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <section className="panel deletion-panel"><h2>删除设备</h2><p className="muted">删除会移除设备档案及其全部附件，原二维码将无法打开。此操作无法撤销；暂时不用的设备可将状态改为“停用”。</p>
 {!open?<button type="button" className="button danger" disabled={disabled} onClick={()=>setOpen(true)}><Trash2 size={16}/>删除设备</button>:<>
  <Field label="输入设备编号确认删除" hint={`请输入已保存的编号：${code}`}><input autoFocus autoComplete="off" value={confirmation} disabled={busy||disabled} onChange={e=>setConfirmation(e.target.value)}/></Field><Notice message={error}/>
  <div className="button-group"><button type="button" className="button danger" disabled={busy||disabled||confirmation.trim()!==code} onClick={async()=>{setBusy(true);setError('');try{await api(`/api/devices/${id}`,{method:'DELETE',body:JSON.stringify({revision,confirmationCode:confirmation})});onDeleted();}catch(e){setError((e as Error).message);setBusy(false);}}}>{busy?'正在删除…':'确认永久删除'}</button><button type="button" className="button" disabled={busy} onClick={()=>{setOpen(false);setConfirmation('');setError('');}}>取消</button></div>
 </>}
 </section>;
}
