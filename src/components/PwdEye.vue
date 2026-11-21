<script setup lang="ts">
/** 密码输入框的显示/隐藏切换按钮（内联线条眼睛图标） */
defineProps<{ show: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button class="eye" type="button" :aria-label="show ? '隐藏密码' : '显示密码'" @click="$emit('toggle')">
    <svg v-if="show" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
    <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M4 4l16 16" />
    </svg>
  </button>
</template>

<style scoped>
.eye {
  position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
  width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
  color: var(--muted); border-radius: 8px;
}
.eye:hover { color: var(--text); }
</style>
