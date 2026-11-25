<script setup lang="ts">
/** 日历回看：月历视图标记有搭配的日期，点日期直接展示当日记录（含衣物小图预览） */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useWardrobeStore } from '@/stores/wardrobe'
import type { OutfitRecord } from '@/types'

const router = useRouter()
const auth = useAuthStore()
const wardrobe = useWardrobeStore()

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const now = new Date()
const cur = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const records = ref<OutfitRecord[]>([])
const loading = ref(false)
/** 选中的日期（YYYY-MM-DD），null = 未选中 */
const selected = ref<string | null>(null)

const curLabel = computed(() => {
  const [y, m] = cur.value.split('-').map(Number)
  return `${y} 年 ${m} 月`
})

/** 月历格子：前置空位 + 当月每一天 */
const cells = computed(() => {
  const [y, m] = cur.value.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const days = new Date(y, m, 0).getDate()
  // 周一为一周起点：周一=0 … 周日=6
  const offset = (first.getDay() + 6) % 7
  const empty = Array.from({ length: offset }, () => null)
  const dayCells = Array.from({ length: days }, (_, i) => `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)
  return [...empty, ...dayCells]
})

const marked = computed(() => new Set(records.value.map((r) => r.worn_date)))

const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

/** 当日记录列表（按保存时间倒序，接口已排序） */
const dayList = computed(() =>
  selected.value ? records.value.filter((r) => r.worn_date === selected.value) : [],
)

function shiftMonth(delta: number) {
  const [y, m] = cur.value.split('-').map(Number)
  // 保持当前选中的日期号切换到新月份（超出当月天数时取当月最后一天）
  const selDay = selected.value ? Number(selected.value.slice(-2)) : null
  const d = new Date(y, m - 1 + delta, 1)
  const y2 = d.getFullYear()
  const m2 = d.getMonth() + 1
  cur.value = `${y2}-${String(m2).padStart(2, '0')}`
  const days = new Date(y2, m2, 0).getDate()
  const day = Math.min(selDay ?? 1, days)
  selected.value = `${cur.value}-${String(day).padStart(2, '0')}`
}

async function load() {
  loading.value = true
  try {
    records.value = await api.listOutfits(cur.value)
  } finally {
    loading.value = false
  }
}

function pickDay(date: string) {
  selected.value = date // 任何一天都可点选，无搭配时展示空提示
}

function timeOf(r: OutfitRecord) {
  const d = new Date(r.created_at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 记录的衣物小图（前 4 件，已删除的衣物跳过） */
function thumbsOf(r: OutfitRecord): string[] {
  const ids = [
    r.items.top, r.items.bottom, r.items.hat, r.items.headwear, r.items.scarf,
    ...r.items.jewel,
  ].filter((x): x is number => x !== null)
  const imgs: string[] = []
  for (const id of ids) {
    const it = wardrobe.find(id)
    if (it) imgs.push(it.image)
    if (imgs.length >= 4) break
  }
  return imgs
}

onMounted(async () => {
  if (!auth.loaded) void auth.fetchMe()
  if (wardrobe.items.length === 0) await wardrobe.load()
  selected.value = today // 进入日历页默认展示今天的搭配
  await load()
})
</script>

<template>
  <div class="page">
    <div class="ward-head">
      <h2>搭配日历</h2>
      <p class="hint">完成搭配后保存，即可在此回看</p>
    </div>

    <div class="page-body">
      <div class="month-bar">
        <button class="chip" aria-label="上一月" @click="shiftMonth(-1); load()">‹</button>
        <span class="month-label">{{ curLabel }}</span>
        <button class="chip" aria-label="下一月" @click="shiftMonth(1); load()">›</button>
      </div>

      <div class="cal-grid">
        <span v-for="w in WEEKDAYS" :key="w" class="wd">{{ w }}</span>
        <template v-for="(c, i) in cells" :key="`${cur}-${i}`">
          <span v-if="c === null" />
          <button
            v-else
            class="day"
            :class="{ today: c === today, mark: marked.has(c), sel: selected === c }"
            @click="pickDay(c)"
          >
            {{ Number(c.slice(-2)) }}
            <i v-if="marked.has(c)" class="dot" />
          </button>
        </template>
      </div>

      <!-- 当日记录列表 -->
      <div v-if="selected" class="day-list">
        <div class="day-title">{{ selected }} 的搭配</div>
        <button
          v-for="r in dayList"
          :key="r.id"
          class="rec"
          @click="router.push(`/outfits/${r.id}`)"
        >
          <span class="rec-gender">{{ r.gender === 'female' ? '甜甜' : '空空' }}</span>
          <span class="thumbs">
            <img v-for="(t, i) in thumbsOf(r)" :key="i" class="thumb" :src="t" alt="">
            <span v-if="thumbsOf(r).length === 0" class="thumb empty">已删</span>
          </span>
          <span class="rec-time">{{ timeOf(r) }}</span>
          <span class="rec-arrow">›</span>
        </button>
        <div v-if="dayList.length === 0" class="none-block">
          <svg class="none-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect x="7" y="10" width="34" height="30" rx="5" stroke="currentColor" stroke-width="2.5" />
            <path d="M7 19h34" stroke="currentColor" stroke-width="2.5" />
            <path d="M16 6v7M32 6v7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="24" cy="30" r="5" stroke="currentColor" stroke-width="2.5" />
            <path d="M21.8 30l1.7 1.7 3-3.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <p class="none-title">这一天还没有搭配</p>
          <p class="none-sub">完成搭配后点「保存搭配」，就能在这里回看</p>
          <button class="btn ghost none-btn" @click="router.push('/tryon')">去搭配</button>
        </div>
      </div>

      <div v-else-if="!loading && records.length === 0" class="empty-state">
        <p>本月还没有搭配记录</p>
        <button class="btn primary" @click="router.push('/tryon')">去搭配</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ward-head { padding: 16px 16px 4px; }
.ward-head h2 { font-size: 18px; margin: 0 0 4px; }
.ward-head .hint { margin: 0; font-size: 13px; color: var(--muted); }
.month-bar {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  padding: 6px 16px 2px;
}
.month-label { font-weight: 600; min-width: 96px; text-align: center; }
.cal-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
  padding: 10px 16px 0;
}
.cal-grid .wd { text-align: center; font-size: 12px; color: var(--muted); padding: 4px 0; }
.day {
  position: relative; aspect-ratio: 1; border-radius: 10px;
  font-size: 14px; color: var(--text);
}
.day.today { border: 1px solid var(--border); }
.day.mark { background: var(--brand-soft); color: var(--brand-text); font-weight: 600; }
.day.sel { background: var(--brand); color: #fff; }
.day .dot {
  position: absolute; left: 50%; bottom: 4px; transform: translateX(-50%);
  width: 5px; height: 5px; border-radius: 50%; background: var(--brand);
}
.day.sel .dot { background: #fff; }
.day-list { padding: 12px 16px 20px; }
.day-title { font-size: 13px; color: var(--muted); margin-bottom: 8px; }
.none-block { display: flex; flex-direction: column; align-items: center; padding: 26px 0 14px; }
.none-icon { width: 44px; height: 44px; color: var(--border-strong, #b8bec7); margin-bottom: 10px; }
.none-title { margin: 0; font-size: 14px; font-weight: 600; color: var(--text); }
.none-sub { margin: 4px 0 12px; font-size: 12px; color: var(--muted); }
.none-btn { padding: 7px 22px; font-size: 13px; }
.rec {
  display: flex; align-items: center; gap: 10px; width: 100%;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 12px 14px; margin-bottom: 8px; text-align: left;
}
.rec:active { background: var(--surface-2); }
.rec-gender { font-weight: 600; }
.thumbs { display: flex; align-items: center; margin-left: 10px; }
.thumb {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--surface-2); object-fit: contain;
  border: 2px solid var(--surface);
}
.thumb + .thumb { margin-left: -8px; }
.thumb.empty {
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 10px; color: var(--muted);
}
.rec-time { color: var(--muted); font-size: 13px; margin-left: auto; }
.rec-arrow { margin-left: auto; color: var(--muted); }
</style>
