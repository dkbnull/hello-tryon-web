<script setup lang="ts">
/** 确认密码实时匹配提示：确认框非空即提示一致/不一致 */
import { computed } from 'vue'

const props = defineProps<{ password: string; confirm: string }>()

const match = computed(() =>
  props.confirm ? props.confirm === props.password : null,
)
</script>

<template>
  <p v-if="match !== null" class="match" :class="match ? 'ok' : 'bad'">
    {{ match ? '✓ 两次密码一致' : '✗ 两次密码不一致' }}
  </p>
</template>

<style scoped>
.match { font-size: 12px; margin-top: 5px; }
.match.ok { color: var(--brand); }
.match.bad { color: var(--danger); }
</style>
