import {test,expect} from '@playwright/test';
import {Pool} from 'pg';
import {emptyDevice} from '../../lib/types';
const origin=process.env.TEST_BASE_URL||'http://localhost:3000';
if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))throw new Error('仅允许本地验收环境');
const headers={Origin:origin};
test('一键发布：权限、冲突回滚、确认、幂等和内部资料隔离',async({page,playwright})=>{
 const admin=page.request,guest=await playwright.request.newContext({baseURL:origin}),member=await playwright.request.newContext({baseURL:origin});
 const pool=new Pool({connectionString:'postgresql://digitallab:local-development-only@127.0.0.1:54329/digitallab'});const stamp=Date.now(),codes=[`BULK-A-${stamp}`,`BULK-B-${stamp}`,`BULK-P-${stamp}`],email=`bulk-${stamp}@example.com`;const ids:string[]=[];
 try{
  expect((await admin.post('/api/auth',{headers,data:{email:'admin@digitallab.local',password:'LocalLab-Review-2026!'}})).status()).toBe(200);
  for(let i=0;i<3;i++){const r=await admin.post('/api/devices',{headers,data:{...emptyDevice,name:`批量发布验收${i}`,code:codes[i],published:i===2,internalNotes:'保密批量发布备注',loan:{...emptyDevice.loan,borrower:'保密借用人'}}});expect(r.status()).toBe(201);ids.push((await r.json()).id);}
  await admin.post('/api/users',{headers,data:{email,name:'批量验收成员',role:'member',password:'Bulk-Publish-Test!'}});await member.post('/api/auth',{headers,data:{email,password:'Bulk-Publish-Test!'}});
  const selection=ids.slice(0,2).map(id=>({id,revision:1}));
  expect((await guest.post('/api/devices/publish',{headers,data:{devices:selection}})).status()).toBe(401);
  expect((await member.post('/api/devices/publish',{headers,data:{devices:selection}})).status()).toBe(403);
  expect((await admin.post('/api/devices/publish',{headers:{Origin:'https://evil.example'},data:{devices:selection}})).status()).toBe(403);
  expect((await admin.post('/api/devices/publish',{headers,data:{devices:[selection[0],selection[0]]}})).status()).toBe(400);
  const first=(await(await admin.get(`/api/devices/${ids[0]}`)).json()).device;await admin.put(`/api/devices/${ids[0]}`,{headers,data:{...first,name:'已更新的批量验收档案'}});
  expect((await admin.post('/api/devices/publish',{headers,data:{devices:selection}})).status()).toBe(409);
  for(const id of ids.slice(0,2))expect((await guest.get(`/api/devices/${id}`)).status()).toBe(404);
  await page.goto('/');page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:/一键发布草稿/}).click();expect((await guest.get(`/api/devices/${ids[0]}`)).status()).toBe(404);
  // Exercise the real control, limiting writes to this test's own fixtures.
  await page.route('**/api/devices/publish',async route=>{const body=route.request().postDataJSON();expect(body.devices.map((d:any)=>d.id)).toEqual(expect.arrayContaining(ids.slice(0,2)));await route.continue({postData:JSON.stringify({devices:body.devices.filter((d:any)=>ids.slice(0,2).includes(d.id))})});});
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:/一键发布草稿/}).click();await expect(page.getByText('已发布 2 份设备档案',{exact:true})).toBeVisible();
  for(const id of ids.slice(0,2)){const r=await guest.get(`/api/devices/${id}`);expect(r.status()).toBe(200);const d=(await r.json()).device;expect(d.published).toBe(true);expect(d.internalNotes).toBeUndefined();expect(d.loan).toBeUndefined();}
  expect((await(await admin.get(`/api/devices/${ids[2]}`)).json()).device.revision).toBe(1);
  const retry=await admin.post('/api/devices/publish',{headers,data:{devices:selection}});expect(retry.status()).toBe(200);expect((await retry.json()).published).toBe(0);
 }finally{await pool.query('DELETE FROM devices WHERE code=ANY($1::text[])',[codes]);await pool.query('DELETE FROM users WHERE email=$1',[email]);await pool.end();await guest.dispose();await member.dispose();}
});
