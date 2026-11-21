/** 试穿会话状态：当前人物 + 已穿衣物 */
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import type { Category } from '@/types'

const JEWEL_LIMIT = 3

/** 单件衣物的手动调整：位置偏移（px）与缩放 */
export interface Adjust {
  dx: number
  dy: number
  scale: number
}

export const useTryonStore = defineStore('tryon', () => {
  const gender = ref<'female' | 'male'>('female')
  const worn = reactive<Record<'top' | 'bottom' | 'hat' | 'headwear' | 'scarf', number | null> & { jewel: number[] }>({
    top: null,
    bottom: null,
    hat: null,
    headwear: null,
    scarf: null,
    jewel: [],
  })
  /** 衣物 id → 手动调整（会话级，重新穿上保留） */
  const adjustments = reactive<Record<number, Adjust>>({})

  /** 获取（懒创建）某件衣物的调整 */
  function adj(id: number): Adjust {
    return adjustments[id] ?? (adjustments[id] = { dx: 0, dy: 0, scale: 1 })
  }
  function setAdj(id: number, patch: Partial<Adjust>) {
    Object.assign(adj(id), patch)
  }
  function resetAdj(id: number) {
    adjustments[id] = { dx: 0, dy: 0, scale: 1 }
  }

  /** 任一部位有穿着 → 切换人物需确认 */
  const hasWorn = computed(() =>
    (['top', 'bottom', 'hat', 'headwear', 'scarf'] as const).some((k) => worn[k] !== null) ||
    worn.jewel.length > 0,
  )

  /** 上衣 + 下衣就位 → 搭配完成 */
  const outfitDone = computed(() => worn.top !== null && worn.bottom !== null)

  function isWorn(id: number, category: Category): boolean {
    return category === 'jewel' ? worn.jewel.includes(id) : worn[category] === id
  }

  /** 穿/脱切换。返回 'wear' | 'unequip' | 'limit' | null（无变化） */
  function toggle(id: number, category: Category): 'wear' | 'unequip' | 'limit' | null {
    if (category === 'jewel') {
      if (worn.jewel.includes(id)) {
        worn.jewel = worn.jewel.filter((x) => x !== id)
        return 'unequip'
      }
      if (worn.jewel.length >= JEWEL_LIMIT) return 'limit'
      worn.jewel = [...worn.jewel, id]
      return 'wear'
    }
    if (worn[category] === id) {
      worn[category] = null
      return 'unequip'
    }
    worn[category] = id
    return 'wear' // 单件部位：替换不播脱下动效，直接以穿上覆盖
  }

  /** 衣物被删除/改分类时自动脱下 */
  function autoUnequip(id: number, category: Category) {
    if (category === 'jewel') worn.jewel = worn.jewel.filter((x) => x !== id)
    else if (worn[category] === id) worn[category] = null
  }

  function clear() {
    worn.top = worn.bottom = worn.hat = worn.headwear = worn.scarf = null
    worn.jewel = []
    for (const k of Object.keys(adjustments)) delete adjustments[Number(k)]
  }

  return { gender, worn, hasWorn, outfitDone, isWorn, toggle, autoUnequip, clear, adj, setAdj, resetAdj }
})
