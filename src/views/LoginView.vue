<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/toast'
import { checkPasswordStrength, PASSWORD_TIP } from '@/utils/validate'
import PasswordStrength from '@/components/PasswordStrength.vue'
import PasswordMatch from '@/components/PasswordMatch.vue'
import PwdEye from '@/components/PwdEye.vue'
import logoImg from '@/assets/logo.png'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const mode = ref<'login' | 'register'>('login')
const submitting = ref(false)
const showPwd = ref(false)
const showConfirm = ref(false)

const form = reactive({ nickname: '', account: '', password: '', confirm: '', invite: '' })
const errors = reactive({ nickname: '', account: '', password: '', confirm: '', invite: '' })

function validate(): boolean {
  errors.nickname = errors.account = errors.password = errors.confirm = errors.invite = ''
  if (mode.value === 'register' && !form.nickname.trim())
    errors.nickname = '请输入昵称'
  const acc = form.account.trim()
  if (!acc) errors.account = '请输入账号'
  else if (mode.value === 'register' && !/^(1\d{10}|\S+@\S+\.\S+)$/.test(acc))
    errors.account = '请输入正确的邮箱或手机号'
  if (!checkPasswordStrength(form.password)) errors.password = PASSWORD_TIP
  if (mode.value === 'register' && form.confirm !== form.password)
    errors.confirm = '两次输入的密码不一致'
  if (mode.value === 'register' && !form.invite.trim())
    errors.invite = '请输入邀请码'
  return !errors.nickname && !errors.account && !errors.password && !errors.confirm && !errors.invite
}

async function submit() {
  if (submitting.value || !validate()) return
  submitting.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(form.account.trim(), form.password)
      toast.show('欢迎回来，搭配走起 👋')
    } else {
      await auth.register(form.nickname.trim(), form.account.trim(), form.password, form.invite.trim())
      toast.show('注册成功，已进入你的衣橱')
    }
    const redirect = route.query.redirect
    router.replace(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : '操作失败')
  } finally {
    submitting.value = false
  }
}

function switchMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  errors.nickname = errors.account = errors.password = errors.confirm = errors.invite = ''
  form.confirm = ''
  form.invite = ''
}
</script>

<template>
  <div class="page">
    <div class="page-body login-wrap">
      <div class="login-logo">
        <img class="mark" :src="logoImg" alt="穿了么">
        <h1>穿了么</h1>
        <p>拍照入库 · 虚拟人物 · 每日搭配</p>
      </div>

      <form @submit.prevent="submit">
        <div v-if="mode === 'register'" class="field" :class="{ invalid: errors.nickname }">
          <label>昵称</label>
          <input v-model="form.nickname" maxlength="20" placeholder="昵称不超过 20 个字符">
        </div>
        <div class="field" :class="{ invalid: errors.account }">
          <label>账号</label>
          <input v-model="form.account" :placeholder="mode === 'register' ? '手机号或邮箱' : '请输入账号'">
        </div>
        <div class="field" :class="{ invalid: errors.password }">
          <label>密码</label>
          <div class="pwd-box">
            <input
              v-model="form.password"
              :type="showPwd ? 'text' : 'password'"
              :placeholder="mode === 'register' ? PASSWORD_TIP : '请输入密码'"
              @keyup.enter="submit"
            >
            <PwdEye :show="showPwd" @toggle="showPwd = !showPwd" />
          </div>
          <!-- 密码强度实时条（注册态） -->
          <PasswordStrength v-if="mode === 'register'" :password="form.password" />
        </div>
        <div v-if="mode === 'register'" class="field" :class="{ invalid: errors.confirm }">
          <label>确认密码</label>
          <div class="pwd-box">
            <input
              v-model="form.confirm"
              :type="showConfirm ? 'text' : 'password'"
              placeholder="请再次输入密码"
              @keyup.enter="submit"
            >
            <PwdEye :show="showConfirm" @toggle="showConfirm = !showConfirm" />
          </div>
          <!-- 两次密码实时匹配提示 -->
          <PasswordMatch :password="form.password" :confirm="form.confirm" />
        </div>
        <div v-if="mode === 'register'" class="field" :class="{ invalid: errors.invite }">
          <label>邀请码</label>
          <input v-model="form.invite" placeholder="请输入邀请码" @keyup.enter="submit">
        </div>
        <button class="btn primary block" type="submit" :disabled="submitting">
          {{ submitting ? '请稍候…' : mode === 'login' ? '登录' : '注册并进入' }}
        </button>
      </form>

      <div class="login-foot">
        <template v-if="mode === 'login'">没有账号？<button class="link" @click="switchMode">去注册</button></template>
        <template v-else>已有账号？<button class="link" @click="switchMode">去登录</button></template>
      </div>
      <div class="login-foot hint">登录后你的衣橱仅自己可见</div>
    </div>
  </div>
</template>

<style scoped>
.login-wrap { padding: 56px 26px 0; overflow-y: auto; }
.login-logo { text-align: center; margin-bottom: 28px; }
.login-logo .mark { width: 64px; height: 64px; border-radius: 16px; margin: 0 auto 12px; display: block; }
.login-logo h1 { font-size: 20px; }
.login-logo p { font-size: 13px; color: var(--muted); }
.pwd-box { position: relative; }
.pwd-box input { width: 100%; padding-right: 42px; }
.login-foot { padding: 16px 0 0; text-align: center; font-size: 13px; }
.login-foot + .login-foot { padding: 10px 0 22px; }
.login-foot .link { color: var(--brand-text); font-weight: 600; }
</style>
