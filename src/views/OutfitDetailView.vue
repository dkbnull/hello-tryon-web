<script setup lang="ts">
/** 搭配回放：按记录复现当日穿着，支持一键再穿、导出图片、删除记录 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import AvatarFigure from '@/components/AvatarFigure.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useToast } from '@/composables/toast'
import { useTryonStore } from '@/stores/tryon'
import { useWardrobeStore } from '@/stores/wardrobe'
import { CATEGORIES, SLOT_BOX, BASE_LAYER, catName, type Category, type ClothingItem, type OutfitRecord } from '@/types'
import { composeOutfit, shareOrDownload } from '@/utils/outfitImage'

const route = useRoute()
const router = useRouter()
const tryon = useTryonStore()
const wardrobe = useWardrobeStore()
const toast = useToast()

const record = ref<OutfitRecord | null>(null)
const showDelete = ref(false)
const exporting = ref(false)

type SlotEntry = { slot: Category; item: ClothingItem }

/** 已解析的穿着衣物（含首饰多件），无效 id 不在其中 */
const wornItems = ref<SlotEntry[]>([])

/** 已删除的部位：slot → 件数（用于灰占位渲染） */
const deletedSlots = computed(() => {
  if (!record.value) return []
  const m = new Map<Category, number>()
  for (const c of CATEGORIES) {
    if (c.k === 'jewel') {
      const gone = record.value.items.jewel.filter((id) => !wardrobe.find(id)).length
      if (gone) m.set('jewel', gone)
    } else {
      const id = record.value.items[c.k]
      if (id !== null && !wardrobe.find(id)) m.set(c.k, 1)
    }
  }
  return [...m.entries()].map(([slot, n]) => ({ slot, n }))
})

function resolveItems(rec: OutfitRecord) {
  const arr: SlotEntry[] = []
  for (const c of CATEGORIES) {
    if (c.k === 'jewel') {
      for (const id of rec.items.jewel) {
        const it = wardrobe.find(id)
        if (it) arr.push({ slot: c.k, item: it })
      }
    } else {
      const id = rec.items[c.k]
      if (id !== null) {
        const it = wardrobe.find(id)
        if (it) arr.push({ slot: c.k, item: it })
      }
    }
  }
  wornItems.value = arr
}

/** 一键再穿：剔除已删除的衣物后，把记录中的穿着与调整快照恢复到试穿台 */
function wearAgain() {
  if (!record.value) return
  const rec = record.value
  const pick = (id: number | null) => (id !== null && wardrobe.find(id) ? id : null)
  const items = {
    top: pick(rec.items.top),
    bottom: pick(rec.items.bottom),
    hat: pick(rec.items.hat),
    headwear: pick(rec.items.headwear),
    scarf: pick(rec.items.scarf),
    jewel: rec.items.jewel.filter((id) => wardrobe.find(id)),
  }
  tryon.restore(items, rec.adjustments)
  toast.show('已穿回这套搭配')
  router.push('/tryon')
}

/** 导出图片：canvas 合成（水印），支持系统分享则分享，否则下载 */
async function exportImage() {
  if (exporting.value || !record.value) return
  exporting.value = true
  try {
    const blob = await composeOutfit(record.value.gender, wornItems.value, record.value.adjustments)
    const r = await shareOrDownload(blob, `穿了么搭配-${record.value.worn_date}.png`)
    toast.show(r === 'shared' ? '已调起分享' : '图片已保存')
  } catch (e) {
    if ((e as Error).name !== 'AbortError') toast.show('导出失败，请重试')
  } finally {
    exporting.value = false
  }
}

async function confirmDelete() {
  if (!record.value) return
  await api.deleteOutfit(record.value.id)
  toast.show('已删除记录')
  router.push('/calendar')
}

onMounted(async () => {
  const id = Number(route.params.id)
  if (wardrobe.items.length === 0) await wardrobe.load()
  const rec = await api.getOutfit(id)
  record.value = rec
  resolveItems(rec)
})
</script>

<template>
  <div class="page">
    <div class="appnav">
      <button class="back" aria-label="返回日历" @click="router.push('/calendar')">‹</button>
      <span class="title">搭配回放</span>
    </div>

    <div v-if="record" class="page-body">
      <p class="hint" style="text-align:center;margin:6px 0 0">
        {{ record.worn_date }} · {{ record.gender === 'female' ? '甜甜' : '空空' }}
      </p>

      <div class="stage">
        <div class="stage-inner">
          <AvatarFigure :gender="record.gender" />
          <div class="clothes-layer">
            <img
              v-for="({ slot, item }, i) in wornItems"
              :key="`${slot}-${item.id}`"
              class="overlay"
              :src="item.image"
              :alt="item.name"
              :style="{
                left: SLOT_BOX[slot].left + '%',
                top: SLOT_BOX[slot].top + '%',
                width: SLOT_BOX[slot].width + '%',
                zIndex: (record.adjustments[item.id]?.z ?? BASE_LAYER[slot]) * 100 + i,
                transform: `translate(${record.adjustments[item.id]?.dx ?? 0}px, ${record.adjustments[item.id]?.dy ?? 0}px) scale(${record.adjustments[item.id]?.scale ?? 1})`,
              }"
            >
            <!-- 已删除衣物的灰占位 -->
            <div
              v-for="d in deletedSlots"
              :key="`del-${d.slot}`"
              class="overlay del-box"
              :style="{
                left: SLOT_BOX[d.slot].left + '%',
                top: SLOT_BOX[d.slot].top + '%',
                width: SLOT_BOX[d.slot].width + '%',
                zIndex: BASE_LAYER[d.slot],
              }"
            >
              <span>衣物已删除</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 已穿标签条 -->
      <div class="worn-bar">
        <span v-for="{ slot, item } in wornItems" :key="`${slot}-${item.id}`" class="worn-chip">
          <b>{{ item.name }}</b>
        </span>
        <span v-for="d in deletedSlots" :key="`chip-${d.slot}`" class="worn-chip gone">
          {{ catName(d.slot) }}已删除
        </span>
      </div>

      <div class="actions">
        <button class="btn primary block" @click="wearAgain">一键再穿</button>
        <div class="sub-row">
          <button class="btn ghost block" :disabled="exporting" @click="exportImage">
            {{ exporting ? '正在生成…' : '导出图片' }}
          </button>
          <button class="btn danger-ghost block" @click="showDelete = true">删除记录</button>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p>搭配记录不存在或已被删除</p>
      <button class="btn ghost" @click="router.push('/calendar')">返回日历</button>
    </div>

    <ConfirmModal
      :show="showDelete"
      title="删除记录"
      text="该条搭配记录将被删除，且无法恢复。"
      confirm-text="删除"
      danger
      @confirm="confirmDelete"
      @cancel="showDelete = false"
    />
  </div>
</template>

<style scoped>
.stage-inner { position: relative; width: min(64vw, 240px); margin: 0 auto; }
.clothes-layer { position: absolute; inset: 0; z-index: 2; }
.overlay {
  position: absolute; object-fit: contain; height: auto;
  pointer-events: none;
  filter: drop-shadow(0 1px 2px rgba(16, 24, 40, 0.15));
}
.del-box {
  display: flex; align-items: center; justify-content: center;
  height: 56px; min-height: 56px;
  border: 1.5px dashed var(--border); border-radius: 10px;
  background: var(--surface-2); color: var(--muted); font-size: 12px;
  filter: none;
}
.worn-bar { min-height: 36px; }
.worn-chip.gone { background: var(--surface-2); color: var(--muted); }
.actions { padding: 10px 16px 20px; }
.sub-row { display: flex; gap: 10px; margin-top: 10px; }
.sub-row .btn { flex: 1; }
.btn.danger-ghost {
  background: none; color: var(--danger); border: 1px solid var(--danger);
}
</style>
