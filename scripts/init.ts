import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { initSchema, db } from '../lib/db';
import { emptyDevice } from '../lib/types';
import { accountSchema } from '../lib/validation';
await initSchema();
const admin=accountSchema.parse({email:process.env.ADMIN_EMAIL,name:'实验室管理员',role:'admin',password:process.env.ADMIN_PASSWORD});
if (/CHANGE_ME|REPLACE_WITH|password123/i.test(admin.password)) throw new Error('请设置安全的初始密码');
await db.query('INSERT INTO users(id,email,name,role,password_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(email) DO NOTHING',[randomUUID(),admin.email,admin.name,admin.role,await bcrypt.hash(admin.password,12)]);
if(process.env.SEED_DEMO==='true') {
  const examples=[{id:'demo00000001',code:'DEMO-001',name:'高速冷冻离心机',category:'样品制备',model:'示例型号 CF-24',room:'样品制备室 · 201',manufacturer:'示例厂家',parameters:'此记录仅供界面演示，所有参数与操作资料需根据真实设备核对。'}, {id:'demo00000002',code:'DEMO-002',name:'紫外可见分光光度计',category:'分析检测',model:'示例型号 UV-2600',room:'分析检测室 · 203',manufacturer:'示例厂家'}, {id:'demo00000003',code:'DEMO-003',name:'超低温冰箱',category:'样品存储',model:'示例型号 ULT-80',room:'样品存储室 · 202',manufacturer:'示例厂家',status:'维护中' as const}];
  for(const e of examples) {const {id,...fields}=e; const data={...emptyDevice,...fields,isDemo:true,published:true,owner:'示例负责人',precautions:'演示资料，使用前请向设备负责人确认实际操作要求。'}; await db.query('INSERT INTO devices(id,code,data) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[id,e.code,JSON.stringify(data)]); }
}
console.log('数据库初始化完成；已有账号密码不会被覆盖。'); await db.end();
