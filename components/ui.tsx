'use client';
import type { ReactNode } from 'react';
export async function api<T=Record<string,unknown>>(url:string,init?:RequestInit):Promise<T>{const r=await fetch(url,{...init,headers:{...(init?.body instanceof FormData?{}:{'Content-Type':'application/json'}),...init?.headers}});const b=await r.json();if(!r.ok)throw new Error(b.error||'请求失败');return b;}
export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;}
export function Notice({message,type='error'}:{message:string;type?:'error'|'success'}){return message?<div className={`notice ${type}`} role={type==='error'?'alert':'status'}>{message}</div>:null;}
export function Status({value}:{value:string}){return <span className={`status ${value==='正常'?'good':value==='故障'?'bad':['维护中','出借中'].includes(value)?'warn':'neutral'}`}><i/>{value}</span>;}
export function Empty({children}:{children:ReactNode}){return <div className="empty">{children}</div>;}
