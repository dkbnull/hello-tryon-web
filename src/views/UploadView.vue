<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, type ProcessResult } from '@/api'
import { CATEGORIES, catName, type ClothingItem } from '@/types'
import { useWardrobeStore } from '@/stores/wardrobe'
import { useToast } from '@/composables/toast'

const router = useRouter()
const wardrobe = useWardrobeStore()
const toast = useToast()

type Phase = 'pick' | 'processing' | 'result' | 'fail'
const phase = ref<Phase>('pick')
const file = ref<File | null>(null)
const result = ref<ProcessResult | null>(null)
const editName = ref('')
const editCategory = ref('top')
const rotation = ref(0) // 手动旋转角度（顺时针累计），提交时由后端应用
const saving = ref(false)

function pickPhoto(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f) return
  // 上传约束：JPG/PNG、≤10MB，超限选取时即拦截
  if (!['image/jpeg', 'image/png'].includes(f.type)) {
    toast.show('仅支持 JPG / PNG 格式图片')
    input.value = ''
    return
  }
  if (f.size > 10 * 1024 * 1024) {
    toast.show('图片大小不能超过 10MB')
    input.value = ''
    return
  }
  file.value = f
  process()
}

async function process() {
  if (!file.value) return
  phase.value = 'processing'
  try {
    const r = await api.processItem(file.value)
    result.value = r
    editCategory.value = r.category
    editName.value = ''
    rotation.value = 0
    phase.value = 'result'
  } catch (e) {
    phase.value = 'fail'
    toast.show(e instanceof Error ? e.message : 'AI 处理失败')
  }
}

/** 顺时针旋转 */
function rotate(deg: number) {
  rotation.value += deg
}

/** 旋转 90° 的倍数时宽高互换适配预览容器 */
const quarterTurn = computed(() => (((rotation.value % 360) + 360) % 360) % 180 === 90)

const resultStyle = computed(() => ({
  maxWidth: (quarterTurn.value ? 190 : 170) + 'px',
  maxHeight: (quarterTurn.value ? 170 : 190) + 'px',
  transform: `rotate(${rotation.value}deg)`,
}))

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob())
}

async function save() {
  if (!result.value || saving.value) return
  saving.value = true
  try {
    const blob = await dataUrlToBlob(`data:image/png;base64,${result.value.image}`)
    const item = await api.saveItem(
      blob,
      rotation.value,
      editCategory.value,
      editName.value.trim(),
      result.value.conf,
    )
    wardrobe.items.unshift(item)
    toast.show(`「${item.name}」已入衣橱`)
    router.replace('/')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function reset() {
  // 处理结果未入库，取消直接丢弃
  phase.value = 'pick'
  file.value = null
  result.value = null
  rotation.value = 0
}
</script>

<template>
  <div class="page">
    <div class="appnav">
      <button class="back" aria-label="返回衣橱" @click="router.push('/')">‹</button>
      <span class="title">上传衣物</span>
    </div>

    <div class="page-body up-stage">
      <div class="steps">
        <span class="step-dot" :class="{ cur: phase === 'pick', done: phase !== 'pick' }">1</span>
        <span>选择照片</span>
        <span>—</span>
        <span class="step-dot" :class="{ cur: phase === 'processing', done: phase === 'result' || phase === 'fail' }">2</span>
        <span>AI 处理</span>
        <span>—</span>
        <span class="step-dot" :class="{ cur: phase === 'result' }">3</span>
        <span>确认入库</span>
      </div>

      <!-- 选择照片 -->
      <div v-if="phase === 'pick'" class="photo-pick">
        <label class="ph">
          <input type="file" accept="image/jpeg,image/png" hidden @change="pickPhoto">
          📷 点击拍照或选择相册图片
        </label>
        <p class="hint" style="text-align:center">JPG / PNG · ≤ 10MB · 每次一张</p>
        <p class="hint" style="text-align:center">💡 建议衣服平铺或挂拍，袖子 / 裤腿自然张开（呈 A 字形），试穿贴合效果更佳</p>
      </div>

      <!-- AI 处理中 -->
      <div v-else-if="phase === 'processing'" class="proc-box">
        <div class="spin" />
        <h3>AI 正在处理…</h3>
        <p class="hint">抠图、摆正与分类识别中，请稍候</p>
      </div>

      <!-- 处理失败 -->
      <div v-else-if="phase === 'fail'" class="fail-box">
        <div class="fail-icon">✕</div>
        <h3>处理失败</h3>
        <p class="hint" style="margin-bottom:16px">图片可能无法识别，可重试或换一张</p>
        <button class="btn primary" @click="process">重试</button>
        <button class="btn ghost" style="margin-left:10px" @click="reset">重新选图</button>
      </div>

      <!-- 结果确认：可手动旋转 -->
      <div v-else-if="result" class="result-box">
        <div class="result-thumb">
          <img :src="`data:image/png;base64,${result.image}`" alt="处理结果" :style="resultStyle">
        </div>
        <div class="rot-bar">
          <button class="chip" aria-label="逆时针微调 5 度" @click="rotate(-5)">⟲ 5°</button>
          <button class="chip" aria-label="顺时针微调 5 度" @click="rotate(5)">5° ⟳</button>
          <button class="chip" aria-label="旋转 90 度" @click="rotate(90)">旋转 90°</button>
          <button class="chip" aria-label="复位旋转" :disabled="rotation === 0" @click="rotation = 0">复位</button>
        </div>
        <p class="hint" style="text-align:center;margin-bottom:12px">
          衣服不正？可旋转微调后再入库
        </p>

        <div v-if="result.conf >= 0.6" class="conf">
          <span class="hint">抠图置信度</span>
          <div class="bar"><i :style="{ width: (result.conf * 100).toFixed(0) + '%' }" /></div>
          <span class="hint">{{ (result.conf * 100).toFixed(0) }}%</span>
        </div>
        <div v-else class="hint" style="text-align:center;margin-bottom:8px">
          未启用 AI 抠图，已保留原图，请人工核对
        </div>

        <div class="field">
          <label>分类（可修正）</label>
          <select v-model="editCategory">
            <option v-for="c in CATEGORIES" :key="c.k" :value="c.k">{{ c.n }}</option>
          </select>
        </div>
        <div class="field">
          <label>名称（留空自动命名「{{ catName(editCategory) }}-01」）</label>
          <input v-model="editName" maxlength="20" placeholder="给这件衣物起个名字">
        </div>
        <button class="btn primary block" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存入衣橱' }}
        </button>
        <button class="btn ghost block" style="margin-top:10px" @click="reset">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.up-stage { padding: 18px 16px; }
.proc-box h3 { font-size: 16px; margin: 16px 0 6px; }
.fail-box { text-align: center; padding: 26px 20px; }
.fail-icon {
  width: 52px; height: 52px; border-radius: 50%; background: var(--danger-soft);
  color: var(--danger); display: flex; align-items: center; justify-content: center;
  font-size: 24px; margin: 0 auto 12px;
}
.rot-bar { display: flex; justify-content: center; gap: 8px; margin-top: 12px; }
</style>
