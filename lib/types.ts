export const statuses = ['正常', '维护中', '故障', '停用'] as const;
export type Role = 'admin' | 'member';
export type User = { id: string; email: string; name: string; role: Role };
export type SopStep = { title: string; body: string };
export type SopProfile = { id:string;name:string;version:string;applicability:string;precautions:string;steps:SopStep[];sources:{title:string;url:string;locator:string}[];reviewNotes:string[] };
export type Maintenance = { id: string; date: string; kind: string; detail: string; nextDate: string };
export type DeviceData = {
  name: string; code: string; category: string; model: string; manufacturer: string; serial: string;
  room: string; owner: string; ownerPhone: string; manufacturerPhone: string;
  parameters: string; status: typeof statuses[number]; published: boolean; isDemo: boolean;
  labelName: string; labelTips: string[]; precautions: string; sop: SopStep[]; sopVersion: string;
  sopProfiles:SopProfile[];
  purchaseDate: string; price: string; supplier: string; salesPhone: string; warrantyUntil: string; purchaseChannel: string; purchaseUrl: string;
  internalNotes: string; maintenance: Maintenance[];
};
export type Device = DeviceData & { id: string; updatedAt: string; revision: number };
export type Attachment = { id: string; deviceId: string | null; name: string; kind: 'photo' | 'manual' | 'contract' | 'invoice' | 'other' | 'logo'; visibility: 'public' | 'internal'; mime: string; size: number };
export type Settings = { labName: string; contact: string; baseUrl: string; logoId: string; scanToken: string; scanVerifiedAt: string };
export const emptyDevice: DeviceData = {
  name: '', code: '', category: '', model: '', manufacturer: '', serial: '', room: '', owner: '', ownerPhone: '', manufacturerPhone: '',
  parameters: '', status: '正常', published: false, isDemo: false, labelName: '', labelTips: [], precautions: '', sop: [], sopVersion: '',
  sopProfiles:[],
  purchaseDate: '', price: '', supplier: '', salesPhone: '', warrantyUntil: '', purchaseChannel: '', purchaseUrl: '', internalNotes: '', maintenance: []
};
export const defaultSettings: Settings = { labName: '实验室设备档案', contact: '', baseUrl: '', logoId: '', scanToken: '', scanVerifiedAt: '' };
