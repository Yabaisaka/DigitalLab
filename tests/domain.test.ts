import { describe,it,expect } from 'vitest';
import ExcelJS from 'exceljs';
import { emptyDevice,defaultSettings,type Device } from '../lib/types';
import { deviceSchema,publicBaseUrl,accountSchema,accountIdSchema } from '../lib/validation';
import { projectDevice } from '../lib/repository';
import { detectFile } from '../lib/uploads';
import { labelSvg,labelsPdf,labelCheck } from '../lib/labels';
import { importTemplate,parseImport } from '../lib/import';
const device:Device={...emptyDevice,id:'abcdef123456',revision:1,updatedAt:new Date().toISOString(),name:'高速冷冻离心机',code:'LAB-001',model:'CF-24',owner:'张老师',ownerPhone:'010-12345678',price:'98765.43',internalNotes:'采购内部备注',supplier:'供应商机密',maintenance:[{id:'1',kind:'维修',date:'2026-10-01',detail:'内部维护记录',nextDate:''}]};
describe('资料边界与校验',()=>{
  it('账号ID与邮箱都可登录，账号ID不区分大小写',()=>{expect(accountIdSchema.parse('Case-User')).toBe('case-user');expect(accountIdSchema.parse('ADMIN@LAB.EDU')).toBe('admin@lab.edu');expect(accountIdSchema.safeParse('bad user').success).toBe(false);});
  it('管理员账号接受6位密码，角色仅限成员或管理员',()=>{const account={email:'case-user',name:'测试管理员',role:'admin',password:'123456'};expect(accountSchema.safeParse(account).success).toBe(true);expect(accountSchema.safeParse({...account,password:'12345'}).success).toBe(false);expect(accountSchema.safeParse({...account,role:'owner'}).success).toBe(false);});
  it('访客对象完全不包含内部字段',()=>{const publicData=projectDevice({...device,purchaseChannel:'网店',purchaseUrl:'https://shop.example.com/orders/private'},null);for(const k of ['purchaseDate','price','supplier','salesPhone','warrantyUntil','purchaseChannel','purchaseUrl','internalNotes','maintenance'])expect(publicData).not.toHaveProperty(k);expect(JSON.stringify(publicData)).not.toContain('98765');});
  it('网购可不填联系方式，购买链接仅支持http或https',()=>{expect(deviceSchema.safeParse({...device,purchaseChannel:'网店',salesPhone:'',purchaseUrl:'https://shop.example.com/orders/123'}).success).toBe(true);expect(deviceSchema.safeParse({...device,purchaseUrl:'javascript:alert(1)'}).success).toBe(false);});
  it('成员可见内部信息',()=>expect(projectDevice(device,{id:'x',name:'成员',email:'x@y.cn',role:'member'})).toHaveProperty('price','98765.43'));
  it('拒绝空名称、错误价格、非法日期',()=>{for(const change of [{name:''},{price:'-1'},{purchaseDate:'2026-02-30'}])expect(deviceSchema.safeParse({...device,...change}).success).toBe(false);});
  it('默认草稿，空SOP合法',()=>expect(deviceSchema.parse({...device,published:undefined}).published).toBe(false));
  it('公网网址只能是实际HTTPS域名',()=>{expect(publicBaseUrl('https://lab.school.edu/')).toBe('https://lab.school.edu');for(const url of ['http://lab.school.edu','https://localhost','https://127.0.0.1','https://lab.example.com','https://lab.school.edu/path','https://u:p@lab.school.edu'])expect(()=>publicBaseUrl(url)).toThrow();});
  it('文件类型按内容判断，拒绝HTML和伪装文件',()=>{expect(detectFile(Buffer.from('<script>alert(1)</script>'))).toBeNull();expect(detectFile(Buffer.from('%PDF-1.7 test'))).toBe('application/pdf');});
});
describe('标签与打印文件',()=>{
  it('SVG尺寸正确、含预览标记、转义特殊字符',async()=>{const svg=await labelSvg({...device,name:'测试<&设备'},defaultSettings,true);expect(svg).toContain('width="90mm" height="60mm"');expect(svg).toContain('预览 · 请勿张贴');expect(svg).toContain('测试&lt;&amp;设备');expect(svg).not.toContain(device.price);});
  it('长中文名称换行，超过容量明确报错而不是缩小字体',()=>{expect(()=>labelCheck({...device,name:'高精度自动化实验室样品分析检测仪器设备'},defaultSettings)).not.toThrow();expect(()=>labelCheck({...device,name:'超'.repeat(40)},defaultSettings)).toThrow('标签文字过长');});
  it('修改名称不改变二维码网址',async()=>{const a=await labelSvg(device,defaultSettings,false),b=await labelSvg({...device,name:'修改后的名称'},defaultSettings,false);expect(a.match(/<svg x="174"[\s\S]*?<\/svg>/)?.[0]).toBe(b.match(/<svg x="174"[\s\S]*?<\/svg>/)?.[0]);});
  it('局域网样张可扫码且保留预览标记，最长两条提示不越过页脚',async()=>{const svg=await labelSvg({...device,labelTips:['经负责人核对后再使用仪器设备确认全部操作要求','使用前阅读原装说明书如有疑问请联系设备负责人']},{...defaultSettings,baseUrl:'http://192.168.1.10:3310'},true);expect(svg).toContain('192.168.1.10:3310/e/abcdef123456');expect(svg).toContain('预览 · 请勿张贴');expect(svg).toContain('y="151.5"');});
  it('单张PDF使用90×60mm，A4第9张分页，中文字体已嵌入',async()=>{const svg=await labelSvg(device,defaultSettings,true);const pdf=await labelsPdf([svg],false);const text=pdf.toString('latin1');expect(text).toContain('/MediaBox [0 0 255.11811 170.07874]');expect(text).toMatch(/\/FontFile[23]/);const batch=await labelsPdf(Array(9).fill(svg),true);expect(batch.toString('latin1')).toContain('/Count 2');});
});
describe('Excel预览',()=>{
  it('模板可读取，导入记录为草稿',async()=>{const rows=await parseImport(await importTemplate());expect(rows).toHaveLength(1);expect(rows[0].errors).toEqual([]);expect(rows[0].data?.published).toBe(false);});
  it('识别重复编号、错误金额、公式，不静默忽略',async()=>{const w=new ExcelJS.Workbook();const s=w.addWorksheet('设备导入');s.addRow(['设备编号','设备名称','购买价格']);s.addRow(['DUP','设备A','20']);s.addRow(['DUP','设备B','-1']);s.addRow(['FORMULA',{formula:'1+1'},'']);const rows=await parseImport(Buffer.from(await w.xlsx.writeBuffer()));expect(rows[1].errors.join()).toContain('price');expect(rows[2].errors.join()).toContain('公式');});
});
