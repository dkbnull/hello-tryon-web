<script setup lang="ts">
/** 确认弹窗：用于删除衣物、切换人物等不可逆/需抉择操作 */
defineProps<{
  show: boolean
  title: string
  text: string
  confirmText?: string
  danger?: boolean
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div v-if="show" class="modal-mask" @click.self="emit('cancel')">
    <div class="modal">
      <h4>{{ title }}</h4>
      <p>{{ text }}</p>
      <div class="row">
        <button class="btn ghost" @click="emit('cancel')">取消</button>
        <button
          class="btn"
          :class="danger ? 'danger' : 'primary'"
          @click="emit('confirm')"
        >
          {{ confirmText ?? '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>
