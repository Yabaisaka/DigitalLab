import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import path from 'node:path';
import type { Device,Settings } from './types';
export const labelSize={width:90*72/25.4,height:60*72/25.4};
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const width=(s:string)=>Array.from(s).reduce((sum,c)=>sum+(/[\u0020-\u007e]/.test(c)?0.6:1),0);
export function wrap(s:string,units:number,maxLines:number){const lines:string[]=[];let line='';for(const c of s){if(width(line+c)>units){lines.push(line);line=c;}else line+=c;}if(line)lines.push(line);if(lines.length>maxLines)throw new Error('标签文字过长，请缩短标签简称、联系方式或操作提示');return lines;}
export function labelCheck(d:Device,s:Settings){wrap(d.labelName||d.name,11.8,3);wrap(s.labName,18,1);wrap(d.code,8.2,1);wrap(d.model||'待补充',17,1);wrap(d.owner||'待补充',13,1);wrap(d.ownerPhone||'待补充',17,1);d.labelTips.forEach(t=>wrap(t,17,2));}
export async function labelSvg(d:Device,s:Settings,preview:boolean){
  labelCheck(d,s);const url=`${s.baseUrl||'https://example.invalid'}/e/${d.id}`;
  const qr=await QRCode.toString(url,{type:'svg',margin:4,errorCorrectionLevel:'M'});
  const viewBox=qr.match(/viewBox="([^"]+)"/)?.[1];const inner=qr.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,'');
  const {width:w,height:h}=labelSize;
  const tx=(x:number,y:number,str:string,size=8,weight=400)=>`<text x="${x}" y="${y}" font-family="NotoSansCJK" font-size="${size}" font-weight="${weight}" fill="#252532">${esc(str)}</text>`;
  let out=`<svg xmlns="http://www.w3.org/2000/svg" width="90mm" height="60mm" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="white"/><rect x="0.5" y="0.5" width="${w-1}" height="${h-1}" rx="5" fill="none" stroke="#dbdbe3"/><path d="M10 11H${w-10}" stroke="#60509a" stroke-width="2.5"/>`;
  out+=tx(10,25,s.labName,8.5,700)+tx(175,25,d.code,8.5,700);
  wrap(d.labelName||d.name,11.8,3).forEach((t,i)=>out+=tx(10,44+i*14,t,12,700));
  out+=tx(10,87,`型号 ${d.model||'待补充'}`)+tx(10,100,`负责人 ${d.owner||'待补充'}`)+tx(10,112,`电话 ${d.ownerPhone||'待补充'}`);
  let y=123;for(const tip of d.labelTips){wrap(tip,17,2).forEach((line,i)=>{out+=tx(10,y,`${i===0?'· ': '  '}${line}`);y+=9.5;});}
  out+=`<svg x="174" y="39" width="${25*72/25.4}" height="${25*72/25.4}" viewBox="${viewBox}">${inner}</svg>`;
  out+=tx(175,124,'扫码查看操作')+tx(175,135,'与原装说明书');
  const readable=url.replace(/^https?:\/\//,'');wrap(readable,29,1).forEach(t=>out+=tx(10,162,t));
  if(preview)out+=`<rect x="159" y="143" width="86" height="13" rx="2" fill="#f2e9df"/>${tx(164,152,'预览 · 请勿张贴',8)}`;
  return out+'</svg>';
}
export async function labelsPdf(svgs:string[],a4:boolean){
  const {width:w,height:h}=labelSize;const doc=new PDFDocument({size:a4?'A4':[w,h],margin:0,info:{Title:'DigitalLab · 设备信息标签'}});
  const chunks:Buffer[]=[];const done=new Promise<Buffer>((resolve,reject)=>{doc.on('data',b=>chunks.push(b));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  const font=path.join(process.cwd(),'assets/fonts/NotoSansCJKsc-Regular.otf');doc.registerFont('NotoSansCJK',font);
  for(let i=0;i<svgs.length;i++){
    if(i>0&&(!a4||i%8===0))doc.addPage();const pos=i%8;
    const x=a4?(12*72/25.4+(pos%2)*(w+6*72/25.4)):0;const y=a4?(19.5*72/25.4+Math.floor(pos/2)*(h+6*72/25.4)):0;
    SVGtoPDF(doc,svgs[i],x,y,{width:w,height:h,fontCallback:()=> 'NotoSansCJK'});
  }
  doc.end();return done;
}
