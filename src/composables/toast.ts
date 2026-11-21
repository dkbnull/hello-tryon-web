/** 轻量 toast：App.vue 挂载全局组件，任意页面调用 useToast().show() */
import { ref } from 'vue'

const message = ref('')
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
  return {
    message,
    visible,
    show(text: string, duration = 2000) {
      message.value = text
      visible.value = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => (visible.value = false), duration)
    },
  }
}
