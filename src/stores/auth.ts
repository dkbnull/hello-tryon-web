/** 登录态与用户信息 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import { getToken, setTokens } from '@/api/client'
import type { Gender, User } from '@/types'
import { useTryonStore } from './tryon'
import { useWardrobeStore } from './wardrobe'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loaded = ref(false)

  async function fetchMe() {
    if (!getToken()) {
      user.value = null
      loaded.value = true
      return
    }
    try {
      user.value = await api.me()
      // 已维护性别时同步试穿会话（底部「搭配」tab 直达也生效）
      const g = user.value?.avatar_gender
      if (g) useTryonStore().gender = g
    } catch {
      user.value = null // 401 已在 client 中清理 token
    }
    loaded.value = true
  }

  async function login(account: string, password: string) {
    const resp = await api.login(account, password)
    setTokens(resp.token, resp.refresh_token)
    user.value = resp.user
  }

  async function register(nickname: string, account: string, password: string, inviteCode: string) {
    const resp = await api.register(nickname, account, password, inviteCode)
    setTokens(resp.token, resp.refresh_token)
    user.value = resp.user
  }

  async function setGender(gender: Gender) {
    if (user.value) {
      user.value.avatar_gender = gender
      await api.updateMe({ avatar_gender: gender })
    }
  }

  function logout() {
    setTokens(null, null)
    user.value = null
    // 清空业务状态，避免同一浏览器换账号登录后串号
    const tryon = useTryonStore()
    tryon.clear()
    tryon.gender = 'female'
    useWardrobeStore().items = []
  }

  return { user, loaded, fetchMe, login, register, setGender, logout }
})
