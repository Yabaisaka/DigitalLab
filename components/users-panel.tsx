'use client';
import { useState } from 'react';
import { api,Field,Notice } from './ui';
type Account={id:string;name:string;email:string;role:string;active:boolean};

export default function UsersPanel({initial,selfId}:{initial:Account[];selfId:string}) {
  const [users,setUsers]=useState(initial);
  const [form,setForm]=useState({name:'',email:'',password:'',role:'member'});
  const [error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false);
  const [resetId,setResetId]=useState(''),[password,setPassword]=useState('');
  async function reload(){setUsers(await api<Account[]>('/api/users'));}
  async function update(id:string,changes:{active?:boolean;role?:string;password?:string},message:string) {
    setBusy(true);setError('');setSuccess('');
    try{await api('/api/users',{method:'PATCH',body:JSON.stringify({id,...changes})});await reload();setSuccess(message);return true;}
    catch(e){setError((e as Error).message);return false;}
    finally{setBusy(false);}
  }
  return <>
    <div className="page-heading"><div><div className="eyebrow">TEAM ACCESS</div><h1>成员管理</h1><p>管理员可创建账号、任命或撤销管理员。角色变更、停用或重置密码后，该成员需重新登录。</p></div></div>
    <Notice message={error}/><Notice message={success} type="success"/>
    <div className="admin-two-column">
      <section className="panel">
        <h2>实验室成员</h2>
        <div className="member-list">{users.map(user=><div key={user.id} className="member-row">
          <span className="avatar">{user.name[0]}</span>
          <div><strong>{user.name}{user.id===selfId?'（你）':''}</strong><small>{user.email} · {user.active?'启用':'已停用'}</small>
            <select className="member-role" aria-label={`角色：${user.name}`} value={user.role} disabled={busy||user.id===selfId} onChange={e=>{void update(user.id,{role:e.target.value},'角色已更新，该成员需重新登录');}}>
              <option value="member">成员</option><option value="admin">管理员</option>
            </select>
          </div>
          <div className="member-actions">
            <button className="text-button" disabled={busy} onClick={()=>{setResetId(user.id);setPassword('');}}>重置密码</button>
            <button className="text-button danger" disabled={user.id===selfId||busy} onClick={()=>{void update(user.id,{active:!user.active},'账号状态已更新');}}>{user.active?'停用':'启用'}</button>
          </div>
        </div>)}</div>
        {resetId&&<form className="repeat-item" onSubmit={async e=>{e.preventDefault();if(await update(resetId,{password},'密码已重置，该成员需重新登录'))setResetId('');}}>
          <Field label={`为 ${users.find(u=>u.id===resetId)?.name} 设置新密码`}><input required minLength={6} maxLength={128} type="password" value={password} autoComplete="new-password" onChange={e=>setPassword(e.target.value)}/></Field>
          <div className="button-group"><button disabled={busy} className="button primary">保存新密码</button><button type="button" className="button" onClick={()=>setResetId('')}>取消</button></div>
        </form>}
      </section>
      <form className="panel" onSubmit={async e=>{
        e.preventDefault();setBusy(true);setError('');setSuccess('');
        try{await api('/api/users',{method:'POST',body:JSON.stringify(form)});await reload();setForm({name:'',email:'',password:'',role:'member'});setSuccess('新账号已创建，请通过实验室约定的方式交付登录信息');}
        catch(e){setError((e as Error).message);}finally{setBusy(false);}
      }}>
        <h2>创建账号</h2>
        <Field label="姓名"><input required maxLength={60} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
        <Field label="账号 ID / 邮箱" hint="账号ID支持字母、数字、点、短横线、下划线，不区分大小写。"><input required type="text" autoComplete="off" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
        <Field label="初始密码" hint="至少6位；不会通过系统自动发送。"><input required minLength={6} maxLength={128} type="password" autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></Field>
        <Field label="角色"><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="member">成员：查看已发布内部资料</option><option value="admin">管理员：编辑资料与管理账号</option></select></Field>
        <button disabled={busy} className="button primary">{busy?'正在处理…':'创建账号'}</button>
      </form>
    </div>
  </>;
}
