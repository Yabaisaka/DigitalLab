import {describe,it,expect} from 'vitest';
import {emptyDevice,type Device} from '../lib/types';
import {deviceSchema} from '../lib/validation';
import {projectDevice} from '../lib/repository';
describe('出借资料',()=>{
 it('接受出借中并兼容旧档案，校验日期顺序和有效日期',()=>{
  const data={...emptyDevice,name:'测试仪器',code:'LOAN-TEST',status:'出借中',loan:{...emptyDevice.loan,borrower:'借用单位',borrowedAt:'2026-10-08',expectedReturnAt:'2026-10-15'}};
  expect(deviceSchema.safeParse(data).success).toBe(true);
  expect(deviceSchema.safeParse({...data,loan:{...data.loan,expectedReturnAt:'2026-10-07'}}).success).toBe(false);
  expect(deviceSchema.safeParse({...data,loan:{...data.loan,borrowedAt:'2026-02-30'}}).success).toBe(false);
  const {loan:_,...old}=data;expect(deviceSchema.parse(old).loan).toEqual(emptyDevice.loan);
 });
 it('访客只能看到出借状态，成员可查看完整出借信息',()=>{
  const device:Device={...emptyDevice,name:'仪器',code:'LOAN-TEST',status:'出借中',published:true,id:'aabbcc112233',revision:1,updatedAt:new Date().toISOString(),loan:{...emptyDevice.loan,borrower:'内部借用人',contact:'内部联系方式',notes:'内部交接备注'}};
  const guest=projectDevice(device,null);expect(guest.status).toBe('出借中');expect(guest).not.toHaveProperty('loan');expect(JSON.stringify(guest)).not.toContain('内部借用人');
  expect(projectDevice(device,{id:'member',name:'成员',email:'member@test.local',role:'member'})).toHaveProperty('loan',device.loan);
 });
});
