<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import AvatarFigure from '@/components/AvatarFigure.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useToast } from '@/composables/toast'
import { useAuthStore } from '@/stores/auth'
import { useTryonStore } from '@/stores/tryon'
import { useWardrobeStore } from '@/stores/wardrobe'
import { CATEGORIES, SLOT_BOX, BASE_LAYER, type Category, type ClothingItem } from '@/types'

const router = useRouter()
const tryon = useTryonStore()
const auth = useAuthStore()
const wardrobe = useWardrobeStore()
const toast = useToast()

const curSlot = ref<Category>('top')
const showSwitch = ref(false)

// 刷新直达时等待用户信息加载（性别已在 auth.fetchMe 内同步到试穿会话）
onMounted(() => {
  if (!auth.loaded) void auth.fetchMe()
  void wardrobe.load()
})

const SLOT_TIPS: Record<Category, string> = {
  top: '该部位同一时间仅穿一件，穿新衣将自动替换',
  bottom: '该部位同一时间仅穿一件，穿新衣将自动替换',
  hat: '该部位同一时间仅穿一件，穿新衣将自动替换',
  headwear: '该部位同一时间仅穿一件，穿新衣将自动替换',
  scarf: '该部位同一时间仅穿一件，穿新衣将自动替换',
  jewel: '首饰部位可同时穿戴多件（上限 3）',
}

/** 保存搭配记录：日期取用户本地日期（YYYY-MM-DD），后端不做时区换算 */
const saving = ref(false)

function localDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function saveOutfit() {
  if (saving.value) return
  saving.value = true
  try {
    const snap = tryon.snapshot()
    await api.saveOutfit({
      worn_date: localDate(),
      gender: snap.gender,
      items: snap.items,
      adjustments: snap.adjustments,
    })
    toast.show('已保存搭配，可在日历中回看')
  } catch {
    toast.show('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

const list = computed(() => wardrobe.byCategory(curSlot.value))

/** 选中衣物（手动调整目标）：点衣物选中，点空白取消 */
const activeId = ref<number | null>(null)
const activeItem = computed(() => wornItems.value.find((w) => w.item.id === activeId.value))
const activeAdj = computed(() => (activeId.value !== null ? tryon.adj(activeId.value) : null))

/** 拖拽移动（pointer 事件，px 偏移） */
const dragging = ref<number | null>(null)
const dragBase = ref({ x: 0, y: 0, dx: 0, dy: 0 })

function onDragStart(e: PointerEvent, id: number) {
  dragging.value = id
  activeId.value = id
  const adj = tryon.adj(id)
  dragBase.value = { x: e.clientX, y: e.clientY, dx: adj.dx, dy: adj.dy }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  e.stopPropagation() // 不触发 stage 空白的取消选中
}
function onDragMove(e: PointerEvent) {
  if (dragging.value === null) return
  tryon.setAdj(dragging.value, {
    dx: dragBase.value.dx + e.clientX - dragBase.value.x,
    dy: dragBase.value.dy + e.clientY - dragBase.value.y,
  })
}
function onDragEnd() {
  dragging.value = null
}

/** 衣物层序 key：显式 z（缺省用部位基础层序）为主序，同值时按穿着顺序（DOM 序）打破并列。
 *  CSS 同 z-index 时 DOM 靠后者在上，故 tie 序与视觉层序一致，保证全序可比较 */
function layerZ(id: number): number {
  const i = wornItems.value.findIndex((x) => x.item.id === id)
  if (i < 0) return 0
  return (tryon.adj(id).z ?? BASE_LAYER[wornItems.value[i].slot]) * 100 + i
}

/** 调整图层：按当前层序排序后交换相邻位置并重分配连续 z 值（dir=1 上移一层，dir=-1 下移一层）。
 *  不直接交换 z 数值——并列 z（如重置后回落基础层序）会让相邻查找失效，排序方案对并列免疫 */
function shiftLayer(id: number, dir: 1 | -1) {
  const order = [...wornItems.value].sort((a, b) => layerZ(a.item.id) - layerZ(b.item.id))
  const idx = order.findIndex((w) => w.item.id === id)
  const j = idx + dir
  if (j < 0) {
    toast.show('已经在最下层了')
    return
  }
  if (j >= order.length) {
    toast.show('已经在最上层了')
    return
  }
  ;[order[idx], order[j]] = [order[j], order[idx]]
  order.forEach((w, i) => tryon.setAdj(w.item.id, { z: i }))
  toast.show(dir === 1 ? '已上移一层（重叠衣物间生效）' : '已下移一层（重叠衣物间生效）')
}

/** 各部位当前穿着的衣物（ jewellery 多件展开） */
const wornItems = computed(() => {
  const arr: { slot: Category; item: ClothingItem }[] = []
  for (const c of CATEGORIES) {
    if (c.k === 'jewel') {
      for (const id of tryon.worn.jewel) {
        const it = wardrobe.find(id)
        if (it) arr.push({ slot: c.k, item: it })
      }
    } else if (tryon.worn[c.k] !== null) {
      const it = wardrobe.find(tryon.worn[c.k] as number)
      if (it) arr.push({ slot: c.k, item: it })
    }
  }
  return arr
})

/** 脱下动效中的衣物（wear-out 渐隐，220ms 后移除；首饰即时） */
const leaving = ref<{ slot: Category; item: ClothingItem }[]>([])

function toggleWear(item: ClothingItem) {
  const r = tryon.toggle(item.id, item.category)
  if (r === 'limit') {
    toast.show('首饰最多同时穿 3 件，请先脱下一件')
    return
  }
  const verb = item.category === 'jewel' ? ['戴上', '取下'] : ['穿上', '脱下']
  if (r === 'wear') {
    // 多件首饰横向错开排布，偏移并入调整基准，避免渲染层叠加导致拖动跳变
    if (item.category === 'jewel') {
      tryon.setAdj(item.id, { dx: (tryon.worn.jewel.length - 1) * 10 })
    }
    toast.show(`已${verb[0]}「${item.name}」`)
  } else if (r === 'unequip') {
    if (item.category !== 'jewel') {
      leaving.value.push({ slot: item.category, item })
      setTimeout(() => {
        leaving.value = leaving.value.filter((l) => l.item.id !== item.id)
      }, 220)
    }
    toast.show(`已${verb[1]}「${item.name}」`)
  }
}

function switchGender() {
  router.push({ path: '/avatar', query: { from: 'tryon' } })
}
</script>

<template>
  <div class="page">
    <div class="appnav">
      <span class="title">搭配试穿</span>
      <span class="spacer" />
      <button
        v-if="tryon.outfitDone"
        class="chip save"
        :disabled="saving"
        @click="saveOutfit"
      >
        保存搭配
      </button>
      <button class="chip" @click="tryon.hasWorn ? (showSwitch = true) : switchGender()">
        切换人物
      </button>
    </div>

    <div class="page-body">
      <!-- 试穿台：身后层(躯干/腿) → 衣物 → 身前层(手臂/头)，衣物夹在中间呈现穿着效果 -->
      <div class="stage" @pointerdown="activeId = null">
        <div class="stage-inner">
          <AvatarFigure :gender="tryon.gender" />
          <!-- 衣物层 -->
          <div class="clothes-layer">
            <img
              v-for="({ slot, item }, i) in wornItems"
              :key="`${slot}-${item.id}`"
              class="overlay wear-in"
              :class="{ sel: activeId === item.id }"
              :src="item.image"
              :alt="item.name"
              :style="{
                left: SLOT_BOX[slot].left + '%',
                top: SLOT_BOX[slot].top + '%',
                width: SLOT_BOX[slot].width + '%',
                zIndex: (tryon.adj(item.id).z ?? BASE_LAYER[slot]) * 100 + i,
                transform: `translate(${tryon.adj(item.id).dx}px, ${tryon.adj(item.id).dy}px) scale(${tryon.adj(item.id).scale})`,
              }"
              @pointerdown="onDragStart($event, item.id)"
              @pointermove="onDragMove"
              @pointerup="onDragEnd"
              @pointercancel="onDragEnd"
            >
            <!-- 脱下渐隐中 -->
            <img
              v-for="l in leaving"
              :key="`out-${l.item.id}`"
              class="overlay wear-out"
              :src="l.item.image"
              :style="{
                left: SLOT_BOX[l.slot].left + '%',
                top: SLOT_BOX[l.slot].top + '%',
                width: SLOT_BOX[l.slot].width + '%',
                zIndex: BASE_LAYER[l.slot],
              }"
            >
          </div>
        </div>
      </div>

      <!-- 手动调整工具条：点选衣物后出现（三行：提示+完成 / 缩放+重置 / 图层调整） -->
      <div v-if="activeItem && activeAdj" class="adj-bar">
        <div class="adj-row">
          <span class="hint">拖动调位置 · 调图层</span>
          <button class="chip" @click="activeId = null">完成</button>
        </div>
        <div class="adj-row">
          <input
            type="range"
            min="0.5"
            max="1.6"
            step="0.05"
            :value="activeAdj.scale"
            :aria-label="`缩放 ${activeItem.item.name}`"
            @input="tryon.setAdj(activeItem.item.id, { scale: Number(($event.target as HTMLInputElement).value) })"
          >
          <button class="chip" @click="tryon.resetAdj(activeItem.item.id)">重置</button>
        </div>
        <div class="adj-row">
          <button class="chip grow" :aria-label="`上移一层 ${activeItem.item.name}`" @click="shiftLayer(activeItem.item.id, 1)">上移一层</button>
          <button class="chip grow" :aria-label="`下移一层 ${activeItem.item.name}`" @click="shiftLayer(activeItem.item.id, -1)">下移一层</button>
        </div>
      </div>

      <!-- 已穿标签条 -->
      <div class="worn-bar">
        <span v-if="tryon.outfitDone" :key="`done-${wornItems.length}`" class="worn-chip pop done-chip">
          <b>搭配完成 ✓</b>
        </span>
        <span v-for="chip in wornItems" :key="`${chip.slot}-${chip.item.id}`" class="worn-chip">
          <b>{{ chip.item.name }}</b>
          <button class="x" :aria-label="`脱下 ${chip.item.name}`" @click="toggleWear(chip.item)">✕</button>
        </span>
      </div>

      <!-- 部位页签 -->
      <div class="slot-tabs" role="tablist">
        <button
          v-for="c in CATEGORIES"
          :key="c.k"
          class="chip"
          :class="{ on: curSlot === c.k }"
          role="tab"
          @click="curSlot = c.k"
        >
          {{ c.n }}
        </button>
      </div>
      <div class="slot-note">{{ SLOT_TIPS[curSlot] }}</div>

      <!-- 该部位衣物 -->
      <div v-if="list.length === 0" class="empty-state">
        <div class="big">🪡</div>
        <p>该部位暂无衣物</p>
        <button class="btn primary" @click="router.push('/upload')">去衣橱添加</button>
      </div>
      <div v-else class="item-row">
        <div
          v-for="item in list"
          :key="item.id"
          class="it"
          :class="{ worn: tryon.isWorn(item.id, curSlot) }"
          role="button"
          tabindex="0"
          @click="toggleWear(item)"
          @keyup.enter="toggleWear(item)"
        >
          <div class="thumb"><img :src="item.image" :alt="item.name"></div>
          <div class="nm">{{ (tryon.isWorn(item.id, curSlot) ? '✓ ' : '') + item.name }}</div>
        </div>
      </div>
    </div>

    <ConfirmModal
      :show="showSwitch"
      title="切换人物"
      text="切换将清空当前搭配，确定继续吗？"
      @confirm="showSwitch = false; switchGender()"
      @cancel="showSwitch = false"
    />
  </div>
</template>

<style scoped>
.appnav .chip { background: var(--brand); color: #fff; }
.appnav .chip:disabled { opacity: 0.6; }
.stage-inner { position: relative; width: min(64vw, 240px); margin: 0 auto; }
/* 衣物层夹在人物身前层与身后层之间 */
.clothes-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
}
.overlay {
  position: absolute; object-fit: contain; height: auto;
  pointer-events: auto; cursor: grab; touch-action: none;
  filter: drop-shadow(0 1px 2px rgba(16, 24, 40, 0.15));
}
.overlay:active { cursor: grabbing; }
.overlay.sel { outline: 2px dashed var(--brand); outline-offset: 6px; border-radius: 8px; }
.adj-bar {
  display: flex; flex-direction: column; gap: 6px;
  margin: 8px auto 0; padding: 10px 14px; max-width: 340px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; box-shadow: var(--shadow);
}
.adj-row { display: flex; align-items: center; gap: 8px; }
.adj-row .hint { flex: 1; white-space: nowrap; }
.adj-row input[type='range'] { flex: 1; min-width: 0; accent-color: var(--brand); }
.adj-bar .chip { flex-shrink: 0; }
.adj-bar .chip.grow { flex: 1; }
.done-chip { background: var(--brand); color: #fff; border-color: var(--brand); }
</style>
