'use client';
import type {Loan} from '@/lib/types';
import {Field} from './ui';
import DateField from './date-field';
export default function LoanEditor({loan,status,onChange,onReturn}:{loan:Loan;status:string;onChange:(loan:Loan)=>void;onReturn:()=>void}){
 const set=(key:keyof Loan,value:string)=>onChange({...loan,[key]:value});
 return <><h2>出借信息</h2><p className="muted">记录当前或最近一次出借，仅登录成员可见。设备归还后更新运行状态，出借信息仍保留。</p><div className="form-grid">
  <Field label="借用人 / 借用单位"><input value={loan.borrower} onChange={e=>set('borrower',e.target.value)}/></Field>
  <Field label="借用人联系方式"><input value={loan.contact} onChange={e=>set('contact',e.target.value)}/></Field>
  <DateField label="借出日期" value={loan.borrowedAt} onChange={v=>set('borrowedAt',v)}/>
  <DateField label="预计归还日期" value={loan.expectedReturnAt} onChange={v=>set('expectedReturnAt',v)}/>
  <DateField label="实际归还日期" value={loan.returnedAt} onChange={v=>set('returnedAt',v)}/>
 </div><Field label="出借备注"><textarea rows={4} value={loan.notes} onChange={e=>set('notes',e.target.value)} placeholder="用途、交接情况、随附配件等"/></Field>
 {status==='出借中'&&<button className="button" type="button" onClick={onReturn}>标记已归还</button>}<p className="muted">修改后点击“保存档案”生效。归还后请确认设备能否正常使用。</p></>;
}
