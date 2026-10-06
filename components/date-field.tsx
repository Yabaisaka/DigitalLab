'use client';
import { useId, useRef } from 'react';
import { CalendarDays } from 'lucide-react';

export default function DateField({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}) {
  const id=useId();
  const picker=useRef<HTMLInputElement>(null);
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <div className="date-entry">
      <input id={id} type="text" inputMode="numeric" placeholder="yyyy/mm/dd" pattern="[0-9]{4}/[0-9]{2}/[0-9]{2}" maxLength={10} value={value.replaceAll('-','/')} onChange={e=>onChange(e.target.value.replaceAll('/','-'))} title="日期格式：yyyy/mm/dd，例如 2026/10/06"/>
      <button type="button" aria-label={`选择${label}`} onClick={()=>{try{picker.current?.showPicker();}catch{picker.current?.focus();picker.current?.click();}}}><CalendarDays size={19}/></button>
      <input ref={picker} className="date-picker-native" type="date" aria-label={`${label}日历`} tabIndex={-1} value={/^\d{4}-\d{2}-\d{2}$/.test(value)?value:''} onChange={e=>onChange(e.target.value)}/>
    </div>
  </div>;
}
