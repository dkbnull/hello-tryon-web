<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ItemThumb from '@/components/ItemThumb.vue'
import { useWardrobeStore } from '@/stores/wardrobe'
import { CATEGORIES, type Category } from '@/types'
import catAll from '@/assets/icons/cat-all.png'
import emptyWardrobe from '@/assets/icons/empty-wardrobe.png'

const wardrobe = useWardrobeStore()
const router = useRouter()

const filter = ref<Category | 'all'>('all')

/** 分类 chips（全部 + 六个分类） */
const catChips = [
  { k: 'all' as const, n: '全部', i: catAll },
  ...CATEGORIES,
]

const counts = computed(() => {
  const m: Record<string, number> = { all: wardrobe.items.length }
  for (const c of CATEGORIES) m[c.k] = wardrobe.byCategory(c.k).length
  return m
})

const list = computed(() =>
  filter.value === 'all'
    ? wardrobe.items
    : wardrobe.items.filter((i) => i.category === filter.value),
)

onMounted(() => wardrobe.load())
</script>

<template>
  <div class="page">
    <div class="ward-head">
      <h2>我的衣橱</h2>
      <p class="hint">共 {{ wardrobe.items.length }} 件 · 仅自己可见</p>
      <button class="chip head-ic add" aria-label="上传衣物" @click="router.push('/upload')">＋</button>
    </div>

    <div class="cat-bar" role="tablist">
      <button
        v-for="c in catChips"
        :key="c.k"
        class="chip"
        :class="{ on: filter === c.k }"
        role="tab"
        @click="filter = c.k"
      >
        <img class="ci" :src="c.i" alt="">
        {{ c.n }} {{ counts[c.k] }}
      </button>
    </div>

    <div class="page-body">
      <div v-if="wardrobe.items.length === 0 && !wardrobe.loading" class="empty-state">
        <img class="big-ic" :src="emptyWardrobe" alt="空衣柜">
        <p>衣橱还是空的，先上传第一件衣物吧</p>
        <button class="btn primary" @click="router.push('/upload')">上传衣物</button>
      </div>
      <div v-else-if="list.length === 0" class="hint" style="text-align:center;padding:20px 0">
        该分类暂无衣物
      </div>
      <div v-else class="ward-grid">
        <div
          v-for="item in list"
          :key="item.id"
          class="ward-item"
          role="button"
          tabindex="0"
          @click="router.push(`/items/${item.id}`)"
          @keyup.enter="router.push(`/items/${item.id}`)"
        >
          <div class="thumb">
            <ItemThumb :src="item.image" :category="item.category" :alt="item.name" />
          </div>
          <div class="nm">{{ item.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ward-head { padding: 16px 14px 4px; display: flex; align-items: flex-start; }
.ward-head h2 { font-size: 18px; margin-right: 10px; }
.ward-head .hint { flex: 1; padding-top: 6px; }
.head-ic { padding: 5px 11px; font-size: 15px; }
.head-ic.add { margin-left: 8px; font-size: 16px; background: var(--brand); color: #fff; }
.cat-bar .chip { display: inline-flex; align-items: center; gap: 5px; }
.cat-bar .chip img.ci { width: 16px; height: 16px; padding: 0; }
.empty-state .big-ic { width: 120px; display: block; margin: 0 auto 12px; }
</style>
