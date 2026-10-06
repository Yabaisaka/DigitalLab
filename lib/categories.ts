export const defaultCategories = ['3D打印与增材制造', '样品制备', '分析检测', '样品存储', '机械加工', '电子测量', '计算与控制', '通用设备', '其他'];

export function categoryOptions(existing: string[] = []) {
  return [...new Set([...defaultCategories, ...existing].filter(Boolean))];
}
