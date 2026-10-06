import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const env={...process.env,COMPOSE_PROJECT_NAME:'digitallab-acceptance',COMPOSE_FILE:'compose.yaml:compose.acceptance.yaml',POSTGRES_PASSWORD:'AcceptanceDatabasePassword2026',ADMIN_EMAIL:'admin@digitallab.local',ADMIN_PASSWORD:'LocalLab-Review-2026!',SITE_HOST:'localhost',SEED_DEMO:'true'};
const docker=(args:string[])=>execFileSync('docker',['compose',...args],{env,stdio:['ignore','pipe','pipe'],maxBuffer:20*1024*1024}).toString();
function phase(label:string,args:string[]){console.log(label);try{const out=docker(args);console.log(out.slice(-1200));}catch(e){const err=e as {stderr?:Buffer;stdout?:Buffer};console.error(err.stderr?.toString().slice(-4000));console.error(err.stdout?.toString().slice(-1000));throw e;}}
const origin='http://localhost:3300';
async function ready(){for(let i=0;i<60;i++){try{const r=await fetch(`${origin}/api/health`);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,1000));}throw new Error('容器健康检查超时');}
async function auth(){const r=await fetch(`${origin}/api/auth`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:env.ADMIN_EMAIL,password:env.ADMIN_PASSWORD})});if(!r.ok)throw new Error(`登录失败 ${r.status}: ${await r.text()}`);return r.headers.get('set-cookie')!.split(';')[0];}
function assert(value:unknown,message:string){if(!value)throw new Error(message);}
phase('验证Compose配置',['config','--quiet']);
phase('构建生产镜像与初始化工具',['build','app','init']);
phase('启动独立数据库',['up','-d','db']);
phase('初始化干净数据库',['--profile','tools','run','--rm','init']);
phase('启动生产应用',['up','-d','app']);await ready();
let cookie=await auth();const headers={Origin:origin,'Content-Type':'application/json',Cookie:cookie};
const code=`DOCKER-${Date.now().toString().slice(-5)}`;
const created=await fetch(`${origin}/api/devices`,{method:'POST',headers,body:JSON.stringify({name:'容器恢复验收设备',code,status:'正常',published:true,price:'12345.67'})});if(created.status!==201)throw new Error(`创建设备失败 ${await created.text()}`);
const {id}=await created.json();
const form=new FormData();form.set('deviceId',id);form.set('kind','contract');form.set('visibility','internal');form.set('file',new Blob(['%PDF-1.4\ncompose acceptance\n%%EOF'],{type:'application/pdf'}),'restore-contract.pdf');
const uploaded=await fetch(`${origin}/api/files`,{method:'POST',headers:{Origin:origin,Cookie:cookie},body:form});assert(uploaded.ok,'附件上传失败');const fileId=(await uploaded.json()).id;
const backupDir='backups/compose-acceptance';console.log('验证一致性备份');execFileSync('bash',['scripts/backup.sh',backupDir],{env,stdio:'pipe'});assert(existsSync(`${backupDir}/database.dump`)&&existsSync(`${backupDir}/uploads.tar.gz`),'备份文件缺失');await ready();
// Modify the data and remove the file, then restore the original snapshot.
cookie=await auth();headers.Cookie=cookie;const device=await (await fetch(`${origin}/api/devices/${id}`,{headers})).json();
assert((await fetch(`${origin}/api/devices/${id}`,{method:'PUT',headers,body:JSON.stringify({...device.device,name:'备份后修改'})})).ok,'修改失败');
assert((await fetch(`${origin}/api/files/${fileId}`,{method:'DELETE',headers})).ok,'删除验收附件失败');
console.log('验证数据库与附件恢复');execFileSync('bash',['scripts/restore.sh',backupDir,'--confirm-replace'],{env,stdio:'pipe'});await ready();cookie=await auth();headers.Cookie=cookie;
const restored=await (await fetch(`${origin}/api/devices/${id}`,{headers})).json();assert(restored.device.name==='容器恢复验收设备','数据库恢复失败');
const file=await fetch(`${origin}/api/files/${fileId}`,{headers});assert(file.ok&&(await file.text()).includes('compose acceptance'),'附件恢复失败');
const guest=await fetch(`${origin}/api/devices/${id}`);const publicData=await guest.json();assert(!('price' in publicData.device),'生产接口泄露内部字段');assert((await fetch(`${origin}/api/files/${fileId}`)).status===404,'内部附件被公开');
const pdf=await fetch(`${origin}/api/labels?ids=demo00000001&format=pdf&preview=1`,{headers});assert(pdf.ok,'生产容器PDF导出失败');const bytes=new Uint8Array(await pdf.arrayBuffer());assert(Buffer.from(bytes.subarray(0,5)).toString()==='%PDF-','PDF无效');
console.log('PASS: 干净数据库初始化、生产容器登录、资料持久化、附件恢复、权限隔离及中文PDF导出。');
phase('停止验收容器（保留可恢复卷）',['down']);
