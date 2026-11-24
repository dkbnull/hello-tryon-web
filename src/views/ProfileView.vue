<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTryonStore } from '@/stores/tryon'
import { useToast } from '@/composables/toast'
import { api } from '@/api'
import type { Gender } from '@/types'
import ConfirmModal from '@/components/ConfirmModal.vue'
import tiantianImg from '@/assets/avatars/tiantian.png'
import kongkongImg from '@/assets/avatars/kongkong.png'

const router = useRouter()
const auth = useAuthStore()
const tryon = useTryonStore()
const toast = useToast()

/** 默认只读展示，点「修改」进入编辑态（编辑态隐藏退出登录/修改密码） */
const editing = ref(false)
const nickname = ref('')
const gender = ref<Gender>('female')
const originalGender = ref<Gender>('female')
const saving = ref(false)

onMounted(async () => {
  if (!auth.loaded) await auth.fetchMe()
  syncFromUser()
})

function syncFromUser() {
  if (auth.user) {
    nickname.value = auth.user.nickname
    gender.value = auth.user.avatar_gender
    originalGender.value = auth.user.avatar_gender
  }
}

const dirty = computed(() =>
  nickname.value.trim() !== auth.user?.nickname || gender.value !== originalGender.value,
)

function startEdit() {
  syncFromUser()
  editing.value = true
}

function cancelEdit() {
  syncFromUser()
  editing.value = false
}

/** 保存个人信息：昵称 + 性别一起提交 */
async function saveProfile() {
  const name = nickname.value.trim()
  if (!name) {
    toast.show('昵称不能为空')
    return
  }
  saving.value = true
  try {
    const genderChanged = gender.value !== originalGender.value
    const updated = await api.updateMe({ nickname: name, avatar_gender: gender.value })
    auth.user = updated
    originalGender.value = updated.avatar_gender
    // 性别变更时清空当前搭配（与切换人物语义一致），并同步试穿会话
    if (genderChanged) tryon.clear()
    tryon.gender = gender.value
    editing.value = false
    toast.show('个人信息已保存')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function logout() {
  auth.logout()
  router.replace('/login')
}

/** 申请注销账号：进入 7 天冷静期，期间登录自动取消 */
const showDeleteConfirm = ref(false)
const deleting = ref(false)

async function requestDeletion() {
  deleting.value = true
  try {
    await api.requestDeletion()
    showDeleteConfirm.value = false
    auth.logout()
    router.replace('/login')
    toast.show('注销申请已提交，7 天后完成；期间登录将自动取消注销')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : '操作失败')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="appnav">
      <span class="title">个人信息</span>
      <span class="spacer" />
      <button v-if="!editing" class="chip" @click="startEdit">修改</button>
    </div>

    <div class="page-body prof-body">
      <div class="field">
        <label>用户名（昵称）</label>
        <input v-if="editing" v-model="nickname" maxlength="20" placeholder="填写昵称">
        <div v-else class="read-val">{{ auth.user?.nickname }}</div>
      </div>

      <div class="field">
        <label>虚拟人物性别</label>
        <div class="g-grid" :class="{ readonly: !editing }">
          <button
            class="g-card"
            :class="{ on: gender === 'female' }"
            :disabled="!editing"
            @click="gender = 'female'"
          >
            <img :src="tiantianImg" alt="甜甜">
            <b>甜甜 · 女</b>
          </button>
          <button
            class="g-card"
            :class="{ on: gender === 'male' }"
            :disabled="!editing"
            @click="gender = 'male'"
          >
            <img :src="kongkongImg" alt="空空">
            <b>空空 · 男</b>
          </button>
        </div>
        <p v-if="editing" class="hint">保存后，搭配页将按所选性别展示虚拟人物</p>
      </div>

      <!-- 编辑态：仅保存/取消 -->
      <template v-if="editing">
        <button class="btn primary block" :disabled="saving || !dirty" @click="saveProfile">
          {{ saving ? '保存中…' : '保存个人信息' }}
        </button>
        <button class="btn ghost block cancel-btn" @click="cancelEdit">取消</button>
      </template>

      <!-- 只读态：隐私协议 + 修改密码 + 注销账号 + 退出登录 -->
      <template v-else>
        <button class="btn ghost block" @click="router.push('/privacy')">用户隐私协议</button>
        <button class="btn ghost block" @click="router.push('/password')">修改密码</button>
        <button class="btn ghost block del-btn" @click="showDeleteConfirm = true">注销账号</button>
        <button class="btn danger block logout" @click="logout">退出登录</button>
      </template>
    </div>

    <ConfirmModal
      :show="showDeleteConfirm"
      title="申请注销账号"
      text="注销后进入 7 天冷静期，期间再次登录将自动取消注销；冷静期结束后，账号与全部衣物数据将被删除且无法恢复。"
      confirm-text="确认注销"
      danger
      @confirm="requestDeletion"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<style scoped>
.prof-body { padding: 18px 16px 30px; }
.prof-body input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border);
  border-radius: 10px; outline: none; background: var(--surface);
}
.prof-body input:focus { border-color: var(--brand); }
.read-val { padding: 10px 0 2px; font-size: 15px; font-weight: 600; }
.g-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.g-grid.readonly .g-card { cursor: default; }
.g-card {
  border: 2px solid var(--border); border-radius: 14px; padding: 12px;
  text-align: center; background: var(--surface); cursor: pointer;
}
.g-card:disabled { opacity: 1; }
.g-card:hover:not(:disabled) { border-color: var(--brand); }
.g-card.on { border-color: var(--brand); background: var(--brand-soft); }
.g-card img { width: 44%; height: auto; margin: 4px auto 6px; display: block; }
.g-card b { font-size: 14px; }
.cancel-btn { margin-top: 10px; }
.del-btn { margin-top: 22px; color: var(--danger); }
.logout { margin-top: 10px; }
</style>
