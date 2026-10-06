import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { emptyDevice,type SopProfile } from '../lib/types';
import { sopDocumentSchema,applySopDocument,getSopProfiles } from '../lib/sop';
import { deviceSchema } from '../lib/validation';
const example=JSON.parse(readFileSync('public/downloads/sop-template.json','utf8'));
const parsed=()=>sopDocumentSchema.parse(structuredClone(example));
const profile:SopProfile={id:'existing',name:'已有方式',version:'v1',applicability:'',precautions:'',steps:[{title:'检查',body:'真实记录'}],sources:[],reviewNotes:[]};
describe('结构化SOP文件与多方式兼容',()=>{
  it('下载模板满足正式导入协议，包含两套独立方式',()=>{const doc=parsed();expect(doc.sops).toHaveLength(2);expect(doc.format).toBe('digitallab.sop');});
  it('未知协议、未知字段、重复标识、空步骤和过长标签被拒绝',()=>{
    for(const mutate of [(v:typeof example)=>v.schemaVersion=2,(v:typeof example)=>v.price='99',(v:typeof example)=>v.sops[1].id=v.sops[0].id,(v:typeof example)=>v.sops[1].name=v.sops[0].name,(v:typeof example)=>v.sops[0].steps=[],(v:typeof example)=>v.labelTips=['长'.repeat(33)]]){const doc=structuredClone(example);mutate(doc);expect(sopDocumentSchema.safeParse(doc).success).toBe(false);}
  });
  it('来源拒绝脚本链接，保留本地说明书定位信息',()=>{const doc=parsed();doc.sops[0].sources=[{title:'原装说明书',url:'',locator:'第3章，第20页'}];expect(sopDocumentSchema.safeParse(doc).success).toBe(true);doc.sops[0].sources[0].url='javascript:alert(1)';expect(sopDocumentSchema.safeParse(doc).success).toBe(false);});
  it('合并保留其余SOP，同标识整套更新，购买资料及发布状态不变',()=>{
    const data={...emptyDevice,name:'真实设备',code:'LAB-1',price:'99',published:true,sopProfiles:[profile]};const doc=parsed();doc.sops[0]={...profile,version:'v2'};const next=applySopDocument(data,doc,'merge');expect(next.sopProfiles).toHaveLength(2);expect(next.sopProfiles[0].version).toBe('v2');expect(next.name).toBe(data.name);expect(next.price).toBe('99');expect(next.published).toBe(true);expect(next.precautions).toBe(doc.precautions);expect(next.labelTips).toEqual(doc.labelTips);
  });
  it('替换只保留文件中的方式，编号不同禁止应用',()=>{const doc=parsed();const data={...emptyDevice,code:'LAB-1',sopProfiles:[profile]};expect(applySopDocument(data,doc,'replace').sopProfiles.map(p=>p.id)).not.toContain(profile.id);doc.device.code='OTHER';expect(()=>applySopDocument(data,doc,'replace')).toThrow('编号不匹配');});
  it('旧单一SOP无损映射，转换后删除不会从旧字段复活',()=>{const legacy={...emptyDevice,sop:[{title:'原有操作',body:'历史正文'}],sopVersion:'v1'};expect(getSopProfiles(legacy)[0].steps).toEqual(legacy.sop);expect(getSopProfiles(legacy)[0].id).toBe('legacy-default');const next=applySopDocument(legacy,parsed(),'merge');expect(next.sop).toEqual([]);expect(getSopProfiles({...next,sopProfiles:[]})).toEqual([]);});
  it('合并后的重复名称和超出20套无法保存',()=>{const doc=parsed();const data={...emptyDevice,sopProfiles:[{...profile,name:doc.sops[0].name}]};expect(()=>applySopDocument(data,doc,'merge')).toThrow();const tooMany=Array.from({length:21},(_,i)=>({...profile,id:`sop-${i}`,name:`方式${i}`}));expect(deviceSchema.safeParse({...emptyDevice,name:'设备',code:'LAB-1',sopProfiles:tooMany}).success).toBe(false);});
  it('预览阶段拒绝合并后超过可保存大小的档案',()=>{const doc=parsed();doc.sops[0].steps=Array.from({length:50},()=>({title:'长文',body:'x'.repeat(15000)}));const data={...emptyDevice,sopProfiles:[{...profile,steps:Array.from({length:35},()=>({title:'历史',body:'x'.repeat(15000)}))}]};expect(()=>applySopDocument(data,doc,'merge')).toThrow('超过1MB');});
});
