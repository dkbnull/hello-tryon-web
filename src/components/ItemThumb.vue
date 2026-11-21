<script setup lang="ts">
/** 衣物缩略图：优先展示真实图片，加载失败回退为分类 SVG 占位 */
import { ref } from 'vue'
import { catName } from '@/types'

const props = defineProps<{ src: string; category: string; alt?: string }>()
const failed = ref(false)
</script>

<template>
  <img
    v-if="!failed"
    :src="props.src"
    :alt="props.alt ?? props.category"
    loading="lazy"
    @error="failed = true"
  >
  <svg v-else viewBox="0 0 100 105" aria-label="占位图">
    <rect width="100" height="105" fill="#F0F1F4" />
    <text x="50" y="52" text-anchor="middle" font-size="12" fill="#6B7280">
      {{ catName(props.category) }}
    </text>
    <text x="50" y="72" text-anchor="middle" font-size="10" fill="#9AA1AC">图片缺失</text>
  </svg>
</template>
