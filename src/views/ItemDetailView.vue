<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { CATEGORIES } from '@/types'
import { useTryonStore } from '@/stores/tryon'
import { useWardrobeStore } from '@/stores/wardrobe'
import { useToast } from '@/composables/toast'

const route = useRoute()
const router = useRouter()
const wardrobe = useWardrobeStore()
const tryon = useTryonStore()
const toast = useToast()

const item = computed(() =>
  wardrobe.find(Number(route.params.id)),
)
const name = ref('')
const category = ref('')
const showDelete = ref(false)

onMounted(async () => {
  if (!wardrobe.items.length) await wardrobe.load()
  if (item.value) {
    name.value = item.value.name
    category.value = item.value.category
  }
})

async function save() {
  if (!item.value) return
  const oldCategory = item.value.category // 快照：update 后 computed 会指向新分类
  try {
    await wardrobe.update(item.value.id, {
      name: name.value.trim() || undefined,
      category: category.value as typeof item.value.category,
    })
    // 分类被修改导致自动脱下
    if (category.value !== oldCategory && tryon.isWorn(item.value.id, oldCategory)) {
      tryon.autoUnequip(item.value.id, oldCategory)
      toast.show('该衣物分类已修改，试穿中已自动脱下')
    }
    toast.show('已保存')
    router.push('/')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : '保存失败')
  }
}

async function confirmDelete() {
  if (!item.value) return
  const gone = item.value
  showDelete.value = false
  try {
    await wardrobe.remove(gone.id)
    if (tryon.isWorn(gone.id, gone.category)) {
      tryon.autoUnequip(gone.id, gone.category)
      toast.show(`「${gone.name}」已删除，试穿中已自动脱下`)
    } else {
      toast.show(`「${gone.name}」已删除`)
    }
    router.push('/')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : '删除失败')
  }
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div class="page">
    <div class="appnav">
      <button class="back" aria-label="返回衣橱" @click="router.push('/')">‹</button>
      <span class="title">衣物详情</span>
    </div>

    <div v-if="item" class="page-body">
      <div class="det-thumb">
        <img :src="item.image" :alt="item.name">
      </div>
      <div class="det-body">
        <div class="field">
          <label>名称</label>
          <input v-model="name" maxlength="20">
        </div>
        <div class="field">
          <label>分类</label>
          <select v-model="category">
            <option v-for="c in CATEGORIES" :key="c.k" :value="c.k">{{ c.n }}</option>
          </select>
        </div>
        <p class="hint" style="margin-bottom:16px">
          来源：{{ item.source === 'AI' ? 'AI 抠图' : '手动' }} · 入库时间：{{ fmtTime(item.created_at) }}
        </p>
        <button class="btn primary block" @click="save">保存修改</button>
        <button class="btn danger block" style="margin-top:10px" @click="showDelete = true">删除衣物</button>
      </div>
    </div>
    <div v-else class="empty-state">
      <p>衣物不存在或已被删除</p>
      <button class="btn ghost" @click="router.push('/')">返回衣橱</button>
    </div>

    <ConfirmModal
      :show="showDelete"
      title="确认删除"
      :text="`「${item?.name ?? ''}」将被删除，且无法恢复。若正被试穿将同时脱下。`"
      confirm-text="删除"
      danger
      @confirm="confirmDelete"
      @cancel="showDelete = false"
    />
  </div>
</template>

<style scoped>
.det-thumb {
  height: 240px; background: var(--surface-2); display: flex; align-items: center;
  justify-content: center; border-bottom: 1px solid var(--border);
}
.det-thumb img { height: 100%; width: 100%; object-fit: contain; }
.det-body { padding: 16px; }
</style>
