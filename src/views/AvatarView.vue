<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTryonStore } from '@/stores/tryon'
import { useToast } from '@/composables/toast'
import tiantianImg from '@/assets/avatars/tiantian.png'
import kongkongImg from '@/assets/avatars/kongkong.png'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const tryon = useTryonStore()
const toast = useToast()

// 从搭配页「切换人物」进入时，底部按钮显示「返回搭配」
const fromTryon = computed(() => route.query.from === 'tryon')

function selectGender(gender: 'female' | 'male') {
  // 实际更换人物时才清空当前搭配（进入时反悔返回不受影响）
  if (tryon.gender !== gender) tryon.clear()
  tryon.gender = gender
  // 保存偏好失败不阻断流程，但需告知用户
  auth.setGender(gender).catch(() => toast.show('人物性别保存失败，请稍后重试'))
}

function goTryon() {
  router.push('/tryon')
}
</script>

<template>
  <div class="page">
    <div class="appnav">
      <span class="title">选择虚拟人物</span>
    </div>

    <div class="page-body">
      <div class="av-grid">
        <button
          class="av-card"
          :class="{ on: tryon.gender === 'female' }"
          @click="selectGender('female')"
        >
          <img class="av-img" :src="tiantianImg" alt="甜甜" />
          <h3>甜甜 · 女</h3>
          <p>标准身形</p>
        </button>
        <button
          class="av-card"
          :class="{ on: tryon.gender === 'male' }"
          @click="selectGender('male')"
        >
          <img class="av-img" :src="kongkongImg" alt="空空" />
          <h3>空空 · 男</h3>
          <p>标准身形</p>
        </button>
      </div>
      <div style="padding: 0 16px 30px">
        <button class="btn primary block" @click="goTryon">{{ fromTryon ? '返回搭配' : '进入试穿' }}</button>
        <p class="hint" style="text-align:center;margin-top:10px">
          一期提供男 / 女各一套标准身形人物，后续支持更多体型
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.av-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 20px 16px; }
.av-card {
  border: 2px solid var(--border); border-radius: 16px; padding: 14px;
  text-align: center; background: var(--surface);
}
.av-card:hover { border-color: var(--brand); }
.av-card.on { border-color: var(--brand); background: var(--brand-soft); }
.av-card img.av-img { width: 64%; height: auto; margin: 6px auto; display: block; }
.av-card h3 { font-size: 15px; margin: 4px 0 2px; }
.av-card p { font-size: 12px; color: var(--muted); }
</style>
