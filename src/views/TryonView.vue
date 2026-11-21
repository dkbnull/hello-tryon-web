<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AvatarFigure from '@/components/AvatarFigure.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useToast } from '@/composables/toast'
import { useAuthStore } from '@/stores/auth'
import { useTryonStore } from '@/stores/tryon'
import { useWardrobeStore } from '@/stores/wardrobe'
import { CATEGORIES, catName, type Category, type ClothingItem } from '@/types'

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

/** 各部位在人物身上的覆盖框（百分比，基于 450×800 人物画布）。
 *  衣物按「宽度优先」适配：width 撑满锚点框（对齐人物袖展/腿宽），
 *  高度按图片比例自然延展（长西装/长裙自然下垂）；top 即锚点（肩线/腰线/头顶）。 */
const SLOT_BOX: Record<Category, { left: number; top: number; width: number }> = {
  hat: { left: 28, top: 0, width: 44 },
  headwear: { left: 34, top: 2, width: 32 },
  top: { left: 25, top: 19, width: 50 },
  bottom: { left: 32, top: 44, width: 36 },
  scarf: { left: 31, top: 14, width: 38 },
  jewel: { left: 38, top: 20, width: 24 },
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
              v-for="{ slot, item } in wornItems"
              :key="`${slot}-${item.id}`"
              class="overlay wear-in"
              :class="{ sel: activeId === item.id }"
              :src="item.image"
              :alt="item.name"
              :style="{
                left: SLOT_BOX[slot].left + '%',
                top: SLOT_BOX[slot].top + '%',
                width: SLOT_BOX[slot].width + '%',
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
              }"
            >
          </div>
        </div>
      </div>

      <!-- 手动调整工具条：点选衣物后出现 -->
      <div v-if="activeItem && activeAdj" class="adj-bar">
        <span class="hint">拖动衣物调位置 · 缩放</span>
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
        <button class="chip" @click="activeId = null">完成</button>
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
  display: flex; align-items: center; gap: 10px;
  margin: 8px auto 0; padding: 8px 14px; max-width: 340px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; box-shadow: var(--shadow);
}
.adj-bar input[type='range'] { flex: 1; accent-color: var(--brand); }
.done-chip { background: var(--brand); color: #fff; border-color: var(--brand); }
</style>
