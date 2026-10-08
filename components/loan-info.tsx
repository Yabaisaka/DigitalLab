import type {Loan} from '@/lib/types';
import {LockKeyhole} from 'lucide-react';
export default function LoanInfo({loan,status}:{loan:Loan;status:string}){
 if(status!=='出借中'&&!Object.values(loan).some(Boolean))return null;
 return <section className="panel internal-section"><div className="section-title"><LockKeyhole size={18}/><h2>{status==='出借中'?'出借信息':'最近一次出借信息'}</h2><span className="section-extra">仅成员可见</span></div><dl className="info-grid">{[['借用人 / 借用单位',loan.borrower],['借用人联系方式',loan.contact],['借出日期',loan.borrowedAt],['预计归还日期',loan.expectedReturnAt],['实际归还日期',loan.returnedAt],['出借备注',loan.notes]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'待补充'}</dd></div>)}</dl></section>;
}
