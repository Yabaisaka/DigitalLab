'use client';
import { useState } from 'react';
import { Plus,Trash2,Upload,Download,ExternalLink } from 'lucide-react';
import { api,Field,Notice } from './ui';
import MarkdownContent from './markdown-content';
import SopViewer from './sop-viewer';
import { getSopProfiles,applySopDocument,type SopDocument,type SopImportMode } from '@/lib/sop';
import { SOP_SKILL_GITHUB_URL } from '@/lib/sop-skill';
import type { DeviceData,SopProfile } from '@/lib/types';
import '@/app/sop.css';

export default function SopEditor({data,onChange}:{data:DeviceData;onChange:(patch:Partial<DeviceData>)=>void}){
  const profiles=getSopProfiles(data);
  const [selected,setSelected]=useState(''),[file,setFile]=useState<File|null>(null),[doc,setDoc]=useState<SopDocument|null>(null),[mode,setMode]=useState<SopImportMode>('merge'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[applied,setApplied]=useState('');
  const profile=profiles.find(p=>p.id===selected)||profiles[0];
  const updateProfiles=(next:SopProfile[])=>onChange({sopProfiles:next,sop:[],sopVersion:''});
  function update(patch:Partial<SopProfile>){if(profile)updateProfiles(profiles.map(p=>p.id===profile.id?{...p,...patch}:p));}
  function add(withStep=false){const next:SopProfile={id:`sop-${crypto.randomUUID()}`,name:profiles.length?`使用方式 ${profiles.length+1}`:'通用操作',version:'',applicability:'',precautions:'',steps:withStep?[{title:'',body:''}]:[],sources:[],reviewNotes:[]};updateProfiles([...profiles,next]);setSelected(next.id);}
  let importError='';let imported:DeviceData|null=null;
  if(doc){try{imported=applySopDocument(data,doc,mode);}catch(e){importError=(e as Error).message;}}
  const mismatched=doc&&(['name','model'] as const).filter(key=>data[key]&&doc.device[key]&&data[key].trim().toLowerCase()!==doc.device[key].trim().toLowerCase());
  return <>
    <h2>SOP与使用方式</h2><p className="muted">上传规范化文件可一次填好提示和多套SOP。先预览并核对，再应用到表单；点击“保存档案”后才会生效。</p>
    <section className="sop-import-box" aria-label="结构化SOP导入">
      <div className="section-title"><Upload size={18}/><h3>导入结构化 SOP</h3></div>
      <div className="sop-downloads"><a className="button" href="/downloads/sop-template.json" download><Download size={15}/>下载JSON模板</a><a className="button" href={SOP_SKILL_GITHUB_URL} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>GitHub安装Skill</a><a href="/downloads/sop-format.md" target="_blank" rel="noopener noreferrer">格式说明</a></div>
      <div className="sop-upload"><Field label="结构化SOP文件（JSON，最多1MB）"><input type="file" accept=".json,application/json" onChange={e=>{setFile(e.target.files?.[0]||null);setDoc(null);setConfirmed(false);setError('');setApplied('');}}/></Field><button className="button" type="button" disabled={!file||busy} onClick={async()=>{setError('');setApplied('');setDoc(null);setConfirmed(false);if(!file)return;if(file.size>1024*1024){setError('SOP文件最多1MB');return;}setBusy(true);try{const f=new FormData();f.set('file',file);const result=await api<{document:SopDocument}>('/api/sop-import',{method:'POST',body:f});setDoc(result.document);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{busy?'正在校验…':'校验并预览'}</button></div>
      <Notice message={error||importError}/><Notice message={applied} type="success"/>
      {doc&&<div className="sop-import-preview">
        <h3>导入预览 · {doc.sops.length}套 SOP</h3><p>文件设备：{doc.device.name} · {doc.device.model||'型号未填写'} · {doc.device.code||'编号未填写'}</p>
        {mismatched&&mismatched.length>0&&<div className="notice">文件与当前档案的{mismatched.map(k=>k==='name'?'名称':'型号').join('、')}不同，请核实是否为同一设备。</div>}
        <Field label="导入方式"><select value={mode} onChange={e=>{setMode(e.target.value as SopImportMode);setConfirmed(false);}}><option value="merge">合并：同标识更新，其余保留</option><option value="replace">替换：用文件替换全部SOP</option></select></Field>
        <div className="sop-change-summary"><strong>{mode==='replace'?'将替换现有全部SOP':'按SOP标识合并'}</strong><ul>{doc.sops.map(p=><li key={p.id}>{profiles.some(v=>v.id===p.id)?'更新':'新增'}：{p.name}（{p.steps.length}步）</li>)}{mode==='replace'&&profiles.filter(p=>!doc.sops.some(s=>s.id===p.id)).map(p=><li key={p.id}>移除：{p.name}</li>)}</ul><p>设备通用使用前提示和标签短提示将使用文件内容。设备名称、型号及其他资料保留。</p></div>
        <details open className="markdown-preview"><summary>新的通用使用前提示</summary><MarkdownContent>{doc.precautions||'待补充'}</MarkdownContent></details>
        <div className="sop-label-preview"><strong>新的标签短提示</strong>{doc.labelTips.length?<ol>{doc.labelTips.map((t,i)=><li key={i}>{t}</li>)}</ol>:<p>不印短提示</p>}</div>
        <SopViewer key={file?.name} profiles={doc.sops}/>
        <label className="checkbox-label sop-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>我已核对设备、操作内容及标签提示，并了解上述更新范围</label>
        <button type="button" className="button primary" disabled={!confirmed||!imported} onClick={()=>{if(!imported)return;onChange({sopProfiles:imported.sopProfiles,sop:[],sopVersion:'',precautions:imported.precautions,labelTips:imported.labelTips});setSelected(doc.sops[0].id);setDoc(null);setConfirmed(false);setApplied('已填入表单；请检查后保存档案。');}}>确认导入到表单</button>
      </div>}
    </section>
    <Field label="使用前注意事项" hint="设备通用提示，适用于所有使用方式；支持Markdown。"><textarea rows={4} value={data.precautions} onChange={e=>onChange({precautions:e.target.value})}/></Field>
    <details className="markdown-preview"><summary>预览注意事项（Markdown）</summary><MarkdownContent>{data.precautions||'待补充'}</MarkdownContent></details>
    <div className="sop-editor-heading"><h3>使用方式（{profiles.length}套）</h3><button type="button" className="button" disabled={profiles.length>=20} onClick={()=>add()}><Plus size={16}/>新增SOP</button></div>
    {profile?<>
      <Field label="编辑使用方式"><select value={profile.id} onChange={e=>setSelected(e.target.value)}>{profiles.map(p=><option key={p.id} value={p.id}>{p.name||'未命名SOP'}</option>)}</select></Field>
      <div className="form-grid"><Field label="SOP名称"><input value={profile.name} onChange={e=>update({name:e.target.value})}/></Field><Field label="SOP版本"><input value={profile.version} onChange={e=>update({version:e.target.value})}/></Field></div>
      <Field label="适用范围 / 使用场景"><textarea rows={2} value={profile.applicability} onChange={e=>update({applicability:e.target.value})}/></Field>
      <Field label="本方式使用前提示"><textarea rows={3} value={profile.precautions} onChange={e=>update({precautions:e.target.value})}/></Field>
      <div className="repeat-list">{profile.steps.map((s,i)=><div className="repeat-item" key={i}><div className="repeat-heading">步骤 {i+1}<button type="button" className="icon-button danger" aria-label={`删除步骤${i+1}`} onClick={()=>update({steps:profile.steps.filter((_,j)=>j!==i)})}><Trash2 size={16}/></button></div><Field label="步骤名称"><input value={s.title} onChange={e=>update({steps:profile.steps.map((v,j)=>j===i?{...v,title:e.target.value}:v)})}/></Field><Field label="操作内容"><textarea rows={4} value={s.body} onChange={e=>update({steps:profile.steps.map((v,j)=>j===i?{...v,body:e.target.value}:v)})}/></Field><details className="markdown-preview"><summary>预览步骤 {i+1}（Markdown）</summary><MarkdownContent>{s.body||'待补充'}</MarkdownContent></details></div>)}</div>
      <div className="button-group"><button type="button" className="button" disabled={profile.steps.length>=100} onClick={()=>update({steps:[...profile.steps,{title:'',body:''}]})}><Plus size={16}/>添加操作步骤</button><button type="button" className="button danger" onClick={()=>{if(window.confirm(`从表单删除“${profile.name}”？保存档案后生效。`)){updateProfiles(profiles.filter(p=>p.id!==profile.id));setSelected('');}}}><Trash2 size={16}/>删除这套SOP</button></div>
      <Field label="待核对事项（每行一条）" hint="资料缺失或冲突时保留在此，核实后再移除。"><textarea value={profile.reviewNotes.join('\n')} rows={2} onChange={e=>update({reviewNotes:e.target.value.split('\n').filter(v=>v.trim())})}/></Field>
      {!!profile.sources.length&&<details className="sop-sources"><summary>来源资料（{profile.sources.length}条）</summary><ul>{profile.sources.map((s,i)=><li key={i}>{s.title} · {s.locator}{s.url&&<> · <a href={s.url} target="_blank" rel="noopener noreferrer">查看</a></>}</li>)}</ul></details>}
      <details className="markdown-preview"><summary>预览当前SOP</summary><SopViewer profiles={[profile]}/></details>
    </>:<div className="empty"><p>暂无SOP，可上传结构化文件或手工添加。</p><button type="button" className="button" onClick={()=>add(true)}>添加操作步骤</button></div>}
  </>;
}
