/** 业务 API */
import { del, get, patch, post, upload } from './client'
import type { Category, ClothingItem, Gender, User } from '@/types'

interface TokenResp {
  token: string
  refresh_token: string
  user: User
  deletion_cancelled?: boolean
}

export const api = {
  register: (nickname: string, account: string, password: string, inviteCode: string) =>
    post<TokenResp>('/api/auth/register', { nickname, account, password, invite_code: inviteCode }),
  login: (account: string, password: string) =>
    post<TokenResp>('/api/auth/login', { account, password }),
  me: () => get<User>('/api/auth/me'),
  updateMe: (data: { nickname?: string; avatar_gender?: Gender }) =>
    patch<User>('/api/auth/me', data),
  changePassword: (old_password: string, new_password: string) =>
    patch<User>('/api/auth/me/password', { old_password, new_password }),
  /** 申请注销账号：进入 7 天冷静期，期间登录自动取消 */
  requestDeletion: () => post<{ deletion_at: string }>('/api/auth/me/deletion'),

  listItems: () => get<ClothingItem[]>('/api/items'),
  updateItem: (id: number, data: { name?: string; category?: Category }) =>
    patch<ClothingItem>(`/api/items/${id}`, data),
  deleteItem: (id: number) => del<{ ok: boolean }>(`/api/items/${id}`),
  /** 第一步：AI 处理（抠图/摆正/去衣架），结果不落库 */
  processItem: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return upload<ProcessResult>('/api/items/process', form)
  },
  /** 第二步：确认入库（应用手动旋转、命名、分类） */
  saveItem: (blob: Blob, rotation: number, category: string, name: string, conf: number) => {
    const form = new FormData()
    form.append('image', blob, 'item.png')
    form.append('rotation', String(rotation))
    form.append('category', category)
    form.append('name', name)
    form.append('conf', String(conf))
    return upload<ClothingItem>('/api/items', form)
  },
}

/** AI 处理结果（未入库） */
export interface ProcessResult {
  /** 处理后透明底 PNG 的 base64 */
  image: string
  category: string
  /** 抠图置信度（0.5 表示未启用 AI） */
  conf: number
}
