'use client';
import { useState } from 'react';
import { api,Notice } from './ui';
export default function VerifyButton({token}:{token:string}){const [error,setError]=useState(''),[done,setDone]=useState(false),[busy,setBusy]=useState(false);return <><Notice message={error}/><Notice type="success" message={done?'扫码验证已完成，正式标签已启用。':''}/><button className="button primary" disabled={done||busy} onClick={async()=>{setBusy(true);try{await api('/api/verify',{method:'POST',body:JSON.stringify({token})});setDone(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{busy?'正在确认…':'我已用手机扫码验证，启用正式标签'}</button></>;}
