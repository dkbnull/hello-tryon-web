<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/toast'
import { api } from '@/api'
import { checkPasswordStrength, PASSWORD_TIP } from '@/utils/validate'
import PasswordStrength from '@/components/PasswordStrength.vue'
import PasswordMatch from '@/components/PasswordMatch.vue'
import PwdEye from '@/components/PwdEye.vue'

const router = useRouter()
const toast = useToast()

const oldPwd = ref('')
const newPwd = ref('')
const confirmPwd = ref('')
const showNew = ref(false)
const showConfirm = ref(false)
const changing = ref(false)

async function changePassword() {
  if (!oldPwd.value || !newPwd.value || !confirmPwd.value) {
    toast.show('请填写完整的密码信息')
    return
  }
  if (!checkPasswordStrength(newPwd.value)) {
    toast.show(`新密码${PASSWORD_TIP}`)
    return
  }
  if (newPwd.value !== confirmPwd.value) {
    toast.show('两次输入的新密码不一致')
    return
  }
  changing.value = true
  try {
    await api.changePassword(oldPwd.value, newPwd.value)
    toast.show('密码已修改')
    router.replace('/profile')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : '修改失败')
  } finally {
    changing.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="appnav">
      <button class="back" aria-label="返回个人信息" @click="router.push('/profile')">‹</button>
      <span class="title">修改密码</span>
    </div>

    <div class="page-body pwd-body">
      <div class="field">
        <label>当前密码</label>
        <input v-model="oldPwd" type="password" placeholder="输入当前密码">
      </div>
      <div class="field">
        <label>新密码</label>
        <div class="pwd-box">
          <input v-model="newPwd" :type="showNew ? 'text' : 'password'" placeholder="至少 8 位，含 3 类字符">
          <PwdEye :show="showNew" @toggle="showNew = !showNew" />
        </div>
        <PasswordStrength :password="newPwd" />
      </div>
      <div class="field">
        <label>确认新密码</label>
        <div class="pwd-box">
          <input v-model="confirmPwd" :type="showConfirm ? 'text' : 'password'" placeholder="再次输入新密码">
          <PwdEye :show="showConfirm" @toggle="showConfirm = !showConfirm" />
        </div>
        <PasswordMatch :password="newPwd" :confirm="confirmPwd" />
      </div>
      <button class="btn primary block" :disabled="changing" @click="changePassword">
        {{ changing ? '修改中…' : '修改密码' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pwd-body { padding: 18px 16px; }
.pwd-body input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border);
  border-radius: 10px; outline: none; background: var(--surface);
}
.pwd-body input:focus { border-color: var(--brand); }
.pwd-box { position: relative; }
.pwd-box input { padding-right: 42px; }
</style>
