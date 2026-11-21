<script setup lang="ts">
/** 密码强度实时条：按字符类别数评估（1-2 类弱 / 3 类中 / 4 类强），密码为空时隐藏 */
import { computed } from 'vue'

const props = defineProps<{ password: string }>()

const strength = computed(() => {
  const p = props.password
  if (!p) return 0
  const kinds = [
    /[A-Z]/.test(p),
    /[a-z]/.test(p),
    /\d/.test(p),
    /[^A-Za-z0-9]/.test(p),
  ].filter(Boolean).length
  return kinds <= 2 ? 1 : kinds === 3 ? 2 : 3
})
const LABEL = ['', '弱', '中', '强']
</script>

<template>
  <div v-if="password" class="strength">
    <div class="bars">
      <i v-for="n in 3" :key="n" :class="{ lit: strength >= n, [`s${strength}`]: true }" />
    </div>
    <span class="s-label" :class="`s${strength}`">{{ LABEL[strength] }}</span>
  </div>
</template>

<style scoped>
.strength { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.bars { flex: 1; display: flex; gap: 4px; }
.bars i { height: 4px; flex: 1; border-radius: 999px; background: var(--surface-2); }
.bars i.lit.s1 { background: var(--danger); }
.bars i.lit.s2 { background: #E8A23D; }
.bars i.lit.s3 { background: var(--brand); }
.s-label { font-size: 12px; color: var(--muted); min-width: 16px; text-align: right; }
.s-label.s1 { color: var(--danger); }
.s-label.s2 { color: #E8A23D; }
.s-label.s3 { color: var(--brand); }
</style>
