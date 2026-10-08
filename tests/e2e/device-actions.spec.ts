import {test,expect} from '@playwright/test';
import {Pool} from 'pg';
import {emptyDevice} from '../../lib/types';
const origin=process.env.TEST_BASE_URL||'http://localhost:3000';
if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))throw new Error('此测试仅用于本地环境');
const headers={Origin:origin};
test('出借信息保存、归还、隐私权限及设备确认删除',async({page,playwright})=>{
 const code=`ACTIONS-${Date.now()}`,memberEmail=`actions-${Date.now()}@example.com`;
 const pool=new Pool({connectionString:'postgresql://digitallab:local-development-only@127.0.0.1:54329/digitallab'});
 const guest=await playwright.request.newContext({baseURL:origin}),member=await playwright.request.newContext({baseURL:origin});
 const admin=page.request;let id='';let attachment='';
 try{
  expect((await admin.post('/api/auth',{headers,data:{email:'admin@digitallab.local',password:'LocalLab-Review-2026!'}})).status()).toBe(200);
  const created=await admin.post('/api/devices',{headers,data:{...emptyDevice,name:'设备操作验收',code,published:true}});expect(created.status()).toBe(201);id=(await created.json()).id;
  expect((await admin.post('/api/users',{headers,data:{email:memberEmail,name:'验收成员',role:'member',password:'Actions-Member-2026!'}})).status()).toBe(201);
  expect((await member.post('/api/auth',{headers,data:{email:memberEmail,password:'Actions-Member-2026!'}})).status()).toBe(200);
  await page.goto(`/admin/devices/${id}`);await page.getByLabel('运行状态').selectOption('出借中');await page.getByRole('button',{name:'填写出借信息'}).click();
  await page.getByLabel('借用人 / 借用单位',{exact:true}).fill('验收借用单位');await page.getByLabel('借用人联系方式').fill('内部测试联系方式');
  await page.getByLabel('借出日期',{exact:true}).fill('2026/10/08');await page.getByLabel('预计归还日期',{exact:true}).fill('2026/10/15');await page.getByLabel('出借备注').fill('仅测试交接记录');
  await page.getByRole('button',{name:'保存档案',exact:true}).click();await expect(page.getByText('档案已保存',{exact:true})).toBeVisible();
  const current=(await(await admin.get(`/api/devices/${id}`)).json()).device;expect(current.status).toBe('出借中');expect(current.loan.borrower).toBe('验收借用单位');
  const pub=(await(await guest.get(`/api/devices/${id}`)).json()).device;expect(pub.status).toBe('出借中');expect(pub.loan).toBeUndefined();expect((await(await member.get(`/api/devices/${id}`)).json()).device.loan.contact).toBe('内部测试联系方式');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ncAAAAASUVORK5CYII=','base64');
  const upload=await admin.post('/api/files',{headers,multipart:{deviceId:id,kind:'photo',visibility:'public',file:{name:'delete-test.png',mimeType:'image/png',buffer:png}}});expect(upload.status()).toBe(201);attachment=(await upload.json()).id;
  const confirmation={revision:current.revision,confirmationCode:code};
  expect((await guest.delete(`/api/devices/${id}`,{headers,data:confirmation})).status()).toBe(401);
  expect((await member.delete(`/api/devices/${id}`,{headers,data:confirmation})).status()).toBe(403);
  expect((await admin.delete(`/api/devices/${id}`,{headers:{Origin:'https://evil.example'},data:confirmation})).status()).toBe(403);
  expect((await admin.delete(`/api/devices/${id}`,{headers,data:{...confirmation,confirmationCode:'WRONG'}})).status()).toBe(400);
  expect((await admin.delete(`/api/devices/${id}`,{headers,data:{...confirmation,revision:1}})).status()).toBe(409);
  expect((await guest.get(`/api/files/${attachment}`)).status()).toBe(200);
  await page.getByRole('button',{name:'标记已归还'}).click();await page.getByRole('button',{name:'保存档案',exact:true}).click();await expect.poll(async()=>((await(await admin.get(`/api/devices/${id}`)).json()).device.status)).toBe('正常');
  const returned=(await(await admin.get(`/api/devices/${id}`)).json()).device;expect(returned.loan.returnedAt).not.toBe('');expect(returned.loan.borrower).toBe('验收借用单位');
  await page.getByRole('button',{name:'删除设备',exact:true}).click();await expect(page.getByRole('button',{name:'确认永久删除'})).toBeDisabled();await page.getByLabel('输入设备编号确认删除').fill(code);
  await page.getByRole('button',{name:'确认永久删除'}).click();await page.waitForURL(origin+'/');
  expect((await admin.get(`/api/devices/${id}`)).status()).toBe(404);expect((await guest.get(`/e/${id}`)).status()).toBe(404);expect((await admin.get(`/api/files/${attachment}`)).status()).toBe(404);
  const remaining=await pool.query('SELECT count(*)::int AS count FROM attachments WHERE device_id=$1',[id]);expect(remaining.rows[0].count).toBe(0);
 }finally{
  if(id){await admin.delete(`/api/files/${attachment}`,{headers}).catch(()=>{});await pool.query('DELETE FROM devices WHERE id=$1 AND code=$2',[id,code]);}
  await pool.query('DELETE FROM users WHERE email=$1',[memberEmail]);await pool.end();await guest.dispose();await member.dispose();
 }
});
