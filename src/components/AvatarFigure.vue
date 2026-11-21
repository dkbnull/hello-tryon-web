<script setup lang="ts">
/** 虚拟人物：甜甜（女）/ 空空（男），AI 插画素材（450×800 透明 PNG，统一画布） */
import { computed, ref, watch } from 'vue'
import type { Gender } from '@/types'
import tiantianImg from '@/assets/avatars/tiantian.png'
import kongkongImg from '@/assets/avatars/kongkong.png'

const props = defineProps<{ gender: Gender }>()

const src = computed(() => (props.gender === 'female' ? tiantianImg : kongkongImg))

// 切换人物时重播淡入动效（300ms）
const swapping = ref(false)
let lastGender: Gender | null = null

watch(
  () => props.gender,
  () => {
    if (lastGender === null) {
      lastGender = props.gender
      return
    }
    lastGender = props.gender
    swapping.value = false
    requestAnimationFrame(() => (swapping.value = true))
  },
  { immediate: true },
)
</script>

<template>
  <div class="figure-wrap" :class="{ swap: swapping }">
    <img class="figure" :src="src" alt="虚拟人物" draggable="false" />
  </div>
</template>

<style scoped>
.figure-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 450 / 800;
}
.figure-wrap .figure {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  user-select: none;
}
</style>
