<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, type ProcessResult } from '@/api'
import { CATEGORIES, catName, type ClothingItem } from '@/types'
import { useWardrobeStore } from '@/stores/wardrobe'
import { useTryonStore } from '@/stores/tryon'
import { useToast } from '@/composables/toast'
// 拍照引导图外置资产：按虚拟人物性别 × 上衣/裤装组合
import outlineTopF from '@/assets/guides/top-female.svg'
import outlineTopM from '@/assets/guides/top-male.svg'
import outlineBottomF from '@/assets/guides/bottom-female.svg'
import outlineBottomM from '@/assets/guides/bottom-male.svg'

const router = useRouter()
const wardrobe = useWardrobeStore()
const tryon = useTryonStore()
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

/* ---------- 应用内拍照 ---------- */
const cameraOn = ref(false)
const videoEl = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)
const capturing = ref(false)
// 拍照轮廓提示：上衣 / 裤装
const guide = ref<'top' | 'bottom'>('top')

/**
 * 拍照轮廓图按个人信息中的虚拟人物性别加载，
 * 袖子与身体夹角、两腿夹角与甜甜（女）/ 空空（男）站姿一致，袖子为长袖
 */
const outlines = computed<Record<'top' | 'bottom', string>>(() => {
  if (tryon.gender === 'male') {
    return { top: outlineTopM, bottom: outlineBottomM }
  }
  return { top: outlineTopF, bottom: outlineBottomF }
})

async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast.show('当前环境不支持拍照，请使用相册上传')
    return
  }
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
      audio: false,
    })
  } catch {
    toast.show('无法访问摄像头，请检查权限或改用相册上传')
    return
  }
  cameraOn.value = true
  await nextTick()
  if (videoEl.value) {
    videoEl.value.srcObject = stream.value
    videoEl.value.play().catch(() => {})
  }
}

function stopStream() {
  stream.value?.getTracks().forEach((t) => t.stop())
  stream.value = null
}

function closeCamera() {
  stopStream()
  cameraOn.value = false
}

/** 抓取当前视频帧为 JPEG，走同一处理流程 */
async function capture() {
  const v = videoEl.value
  if (!v || !v.videoWidth || capturing.value) return
  capturing.value = true
  try {
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d')!.drawImage(v, 0, 0)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
    if (!blob) throw new Error('拍摄失败，请重试')
    if (blob.size > 10 * 1024 * 1024) {
      toast.show('图片大小不能超过 10MB')
      return
    }
    file.value = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
    closeCamera()
    process()
  } catch (e) {
    toast.show(e instanceof Error ? e.message : '拍摄失败')
  } finally {
    capturing.value = false
  }
}

onUnmounted(stopStream)
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
        <button class="btn primary block" @click="openCamera">拍照上传</button>
        <label class="btn ghost block album-label">
          从相册选择
          <input type="file" accept="image/jpeg,image/png" hidden @change="pickPhoto">
        </label>
        <p class="hint" style="text-align:center">JPG / PNG · ≤ 10MB · 每次一张</p>
        <p class="hint" style="text-align:center">💡 建议衣服平铺或挂拍，袖子 / 裤腿自然张开（呈 A 字形），试穿贴合效果更佳</p>
      </div>

      <!-- 应用内拍照：带轮廓提示 -->
      <div v-if="cameraOn" class="camera-layer">
        <video ref="videoEl" class="cam-video" autoplay playsinline muted />
        <div class="cam-guide">
          <div class="cam-frame">
            <!-- 引导图外置于 assets/guides，随虚拟人物性别切换 -->
            <img :src="outlines[guide]" alt="">
          </div>
          <p class="cam-tip">将衣物平铺在轮廓框内，尽量填满轮廓</p>
          <div class="cam-tabs">
            <button class="chip" :class="{ on: guide === 'top' }" @click="guide = 'top'">上衣</button>
            <button class="chip" :class="{ on: guide === 'bottom' }" @click="guide = 'bottom'">裤装</button>
          </div>
        </div>
        <button class="cam-close" aria-label="关闭相机" @click="closeCamera">✕</button>
        <div class="cam-bar">
          <button class="cam-shutter" aria-label="拍摄" :disabled="capturing" @click="capture" />
        </div>
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
.album-label { margin-top: 10px; cursor: pointer; }

/* ---------- 相机浮层 ---------- */
.camera-layer {
  position: fixed; inset: 0; z-index: 60; background: #000;
}
.cam-video { width: 100%; height: 100%; object-fit: cover; }
.cam-guide {
  position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%);
  width: min(78vw, 420px); display: flex; flex-direction: column; align-items: center;
}
.cam-frame {
  width: 100%; aspect-ratio: 3 / 4;
  border: 2px dashed rgba(255, 255, 255, 0.7); border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.cam-frame img {
  width: 80%; height: 80%; object-fit: contain;
}
.cam-tip { margin-top: 12px; font-size: 13px; color: rgba(255, 255, 255, 0.85); }
.cam-tabs { margin-top: 10px; display: flex; gap: 8px; }
.cam-tabs .chip { background: rgba(0, 0, 0, 0.35); color: #fff; border-color: rgba(255, 255, 255, 0.4); }
.cam-tabs .chip.on { background: var(--brand); color: #fff; border-color: var(--brand); }
.cam-close {
  position: absolute; top: max(16px, env(safe-area-inset-top)); right: 16px;
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(0, 0, 0, 0.5); color: #fff; font-size: 18px;
  display: flex; align-items: center; justify-content: center;
}
.cam-bar {
  position: absolute; left: 0; right: 0;
  bottom: max(28px, env(safe-area-inset-bottom));
  display: flex; justify-content: center;
}
.cam-shutter {
  width: 68px; height: 68px; border-radius: 50%;
  background: #fff; border: 4px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.25);
}
.cam-shutter:disabled { opacity: 0.5; }
</style>
