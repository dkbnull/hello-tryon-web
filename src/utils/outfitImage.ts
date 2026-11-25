/** 搭配图导出：canvas 合成人物 + 衣物图层 → PNG（含水印），Web Share API 优先、降级下载 */
import tiantianImg from '@/assets/avatars/tiantian.png'
import kongkongImg from '@/assets/avatars/kongkong.png'
import { SLOT_BOX, BASE_LAYER, type Category, type ClothingItem, type Gender, type OutfitAdjust } from '@/types'

const AVATAR_SRC: Record<Gender, string> = { female: tiantianImg, male: kongkongImg }

/** 人物画布尺寸（与 AvatarFigure 的 450×800 统一画布一致） */
const W = 450
const H = 800
/** 试穿台 stage-inner 宽度上限 240px，adjustments 的 dx/dy 为该坐标空间的 px，导出时按比例放大 */
const PX = W / 240

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** 按 SLOT_BOX 百分比定位 + 手动调整绘制一件衣物（与 DOM 渲染规则一致：宽度优先适配，transform-origin 居中） */
function drawItem(ctx: CanvasRenderingContext2D, img: HTMLImageElement, slot: Category, adj: OutfitAdjust) {
  const box = SLOT_BOX[slot]
  const w = (box.width / 100) * W
  const h = (img.naturalHeight / img.naturalWidth) * w
  const x = (box.left / 100) * W
  const y = (box.top / 100) * H
  const cx = x + w / 2 + adj.dx * PX
  const cy = y + h / 2 + adj.dy * PX
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(adj.scale, adj.scale)
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  ctx.restore()
}

/**
 * 合成搭配图：白底 + 人物 + 各衣物图层（按 CATEGORIES 顺序与试穿台一致）+ 右下角水印
 * @param wornItems 已解析的穿着衣物（已剔除被删除的衣物）
 */
export async function composeOutfit(
  gender: Gender,
  wornItems: { slot: Category; item: ClothingItem }[],
  adjustments: Record<string, OutfitAdjust>,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 不可用')

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  const avatar = await loadImage(AVATAR_SRC[gender])
  ctx.drawImage(avatar, 0, 0, W, H)

  // 按图层 key 从小到大绘制（与试穿台 zIndex 公式一致：z 值为主序，并列时按穿着顺序）
  const layers = wornItems
    .map(({ slot, item }, i) => ({
      slot,
      item,
      z: (adjustments[item.id]?.z ?? BASE_LAYER[slot]) * 100 + i,
    }))
    .sort((a, b) => a.z - b.z)
  for (const { slot, item } of layers) {
    const img = await loadImage(item.image)
    drawItem(ctx, img, slot, adjustments[item.id] ?? { dx: 0, dy: 0, scale: 1 })
  }

  // 右下角「穿了么」水印
  ctx.font = '600 22px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = 'rgba(15, 157, 108, 0.85)'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText('穿了么', W - 18, H - 14)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('导出失败'))), 'image/png')
  })
}

/** 分享或下载：支持 Web Share API（携带文件）时调起系统分享面板，否则下载 PNG */
export async function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: '穿了么 · 今日搭配' })
    return 'shared'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
