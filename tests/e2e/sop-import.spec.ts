import { test,expect } from '@playwright/test';
import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { emptyDevice } from '../../lib/types';
const origin=process.env.TEST_BASE_URL||'http://localhost:3000';
if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))throw new Error('SOP验收只允许本地网址');
const headers={Origin:origin};const stamp=Date.now().toString();const code=`SOP-${stamp}`;const email=`sop-member-${stamp}`;
const template=JSON.parse(readFileSync('public/downloads/sop-template.json','utf8'));
const upload=(doc:unknown)=>({headers,multipart:{file:{name:'equipment.sop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))}}});
test.afterAll(async()=>{const pool=new Pool({connectionString:'postgresql://digitallab:local-development-only@127.0.0.1:54329/digitallab'});try{await pool.query('DELETE FROM devices WHERE code=$1',[code]);await pool.query('DELETE FROM users WHERE email=$1',[email]);}finally{await pool.end();}});

test('结构文件服务端校验、权限与Skill下载',async({request,playwright})=>{
  const guest=await playwright.request.newContext({baseURL:origin});
  try{
    expect((await guest.post('/api/sop-import',upload(template))).status()).toBe(401);
    await request.post('/api/auth',{headers,data:{email:'admin@digitallab.local',password:'LocalLab-Review-2026!'}});
    const valid=await request.post('/api/sop-import',upload(template));expect(valid.status()).toBe(200);expect((await valid.json()).document.sops).toHaveLength(2);
    for(const doc of [{...template,schemaVersion:2},{...template,price:'1'},{...template,sops:[template.sops[0],template.sops[0]]},{...template,labelTips:['**不允许格式**']}]){const invalid=await request.post('/api/sop-import',upload(doc));expect(invalid.status()).toBe(400);expect((await invalid.json()).error).toBeTruthy();}
    const badJson=await request.post('/api/sop-import',{headers,multipart:{file:{name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{not json')}}});expect(badJson.status()).toBe(400);
    const tooBig=await request.post('/api/sop-import',{headers,multipart:{file:{name:'large.json',mimeType:'application/json',buffer:Buffer.alloc(1024*1024+1,32)}}});expect(tooBig.status()).toBe(413);
    expect((await request.post('/api/users',{headers,data:{email,name:'SOP验收成员',role:'member',password:'123456'}})).status()).toBe(201);
    await guest.post('/api/auth',{headers,data:{email,password:'123456'}});expect((await guest.post('/api/sop-import',upload(template))).status()).toBe(403);
    const skill=await guest.get('/downloads/lab-sop-generator.zip');expect(skill.status()).toBe(200);expect((await skill.body()).subarray(0,2).toString()).toBe('PK');
    expect((await guest.get('/downloads/sop-template.json')).status()).toBe(200);
  }finally{await guest.dispose();}
});

test('上传预览、自动填写、多SOP切换和替换保留其他设备资料',async({page,request})=>{
  await request.post('/api/auth',{headers,data:{email:'admin@digitallab.local',password:'LocalLab-Review-2026!'}});
  const create=await request.post('/api/devices',{headers,data:{...emptyDevice,name:'SOP导入验收设备',code,model:'TEST',price:'123.45',published:true,precautions:'原提示',labelTips:['原短提示'],sopVersion:'旧版',sop:[{title:'旧操作',body:'旧正文应保留'}]}});expect(create.status()).toBe(201);const {id}=await create.json();
  const doc=structuredClone(template);doc.device={name:'SOP导入验收设备',model:'TEST',code};doc.precautions='- **先核对测量方式**';doc.labelTips=['先确认测量方式','异常时联系负责人'];doc.sops[0].name='常规测量';doc.sops[0].steps=[{title:'常规样品检查',body:'仅为自动验收示例'}];doc.sops[1].name='特殊样品测量';doc.sops[1].steps=[{title:'特殊样品检查',body:'**核对专用条件**'}];for(const p of doc.sops){p.reviewNotes=[];p.version='v1';}
  await page.goto('/login');await page.getByLabel('邮箱').fill('admin@digitallab.local');await page.getByLabel('密码').fill('LocalLab-Review-2026!');await page.getByRole('button',{name:'登录',exact:true}).click();await expect(page).toHaveURL('/');
  await page.goto(`/admin/devices/${id}`);await page.getByRole('tab',{name:'操作 SOP'}).click();
  await expect(page.getByRole('link',{name:'GitHub安装Skill'})).toHaveAttribute('href','https://github.com/Yabaisaka/lab-sop-generator');
  await expect(page.getByRole('link',{name:'GitHub安装Skill'})).toHaveAttribute('target','_blank');
  await expect(page.getByLabel('编辑使用方式')).toHaveValue('legacy-default');
  await page.getByLabel('结构化SOP文件').setInputFiles({name:'equipment.sop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});await page.getByRole('button',{name:'校验并预览'}).click();
  await expect(page.getByRole('heading',{name:'导入预览 · 2套 SOP'})).toBeVisible();await expect(page.getByRole('button',{name:'确认导入到表单'})).toBeDisabled();
  const untouched=(await (await request.get(`/api/devices/${id}`)).json()).device;expect(untouched.precautions).toBe('原提示');expect(untouched.sopProfiles).toHaveLength(0);
  await page.getByLabel('我已核对设备、操作内容及标签提示').check();await page.getByRole('button',{name:'确认导入到表单'}).click();await expect(page.getByText('已填入表单；请检查后保存档案。')).toBeVisible();await expect(page.getByLabel('编辑使用方式').locator('option')).toHaveCount(3);
  await page.getByRole('button',{name:'保存档案'}).click();await expect(page.getByText('档案已保存')).toBeVisible();
  const saved=(await (await request.get(`/api/devices/${id}`)).json()).device;expect(saved.price).toBe('123.45');expect(saved.published).toBe(true);expect(saved.sopProfiles).toHaveLength(3);expect(saved.labelTips).toEqual(doc.labelTips);expect(saved.sop).toEqual([]);
  await page.goto(`/e/${id}`);await page.getByLabel('选择使用方式').selectOption('special-sample');await expect(page.getByRole('heading',{name:'特殊样品检查'})).toBeVisible();await expect(page.locator('.sop-list strong')).toHaveText('核对专用条件');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto(`/admin/devices/${id}`);await page.getByRole('tab',{name:'操作 SOP'}).click();
  doc.device.code='WRONG';await page.getByLabel('结构化SOP文件').setInputFiles({name:'wrong.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});await page.getByRole('button',{name:'校验并预览'}).click();await expect(page.getByText(/设备编号不匹配/)).toBeVisible();await expect(page.getByRole('button',{name:'确认导入到表单'})).toBeDisabled();
  doc.device.code=code;await page.getByLabel('结构化SOP文件').setInputFiles({name:'replace.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});await page.getByRole('button',{name:'校验并预览'}).click();await page.getByLabel('导入方式').selectOption('replace');await expect(page.getByText('移除：通用操作')).toBeVisible();
  await page.getByLabel('我已核对设备、操作内容及标签提示').check();await page.getByRole('button',{name:'确认导入到表单'}).click();await page.getByRole('button',{name:'保存档案'}).click();await expect(page.getByText('档案已保存')).toBeVisible();
  await page.reload();await page.getByRole('tab',{name:'操作 SOP'}).click();await expect(page.getByLabel('编辑使用方式').locator('option')).toHaveCount(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
