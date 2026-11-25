/** 全局类型定义（分类枚举与 PRD 通用规则一致） */
import catTop from '@/assets/icons/cat-top.png'
import catBottom from '@/assets/icons/cat-bottom.png'
import catHat from '@/assets/icons/cat-hat.png'
import catHeadwear from '@/assets/icons/cat-headwear.png'
import catScarf from '@/assets/icons/cat-scarf.png'
import catJewel from '@/assets/icons/cat-jewel.png'

export type Category = 'top' | 'bottom' | 'hat' | 'headwear' | 'scarf' | 'jewel'
export type Gender = 'female' | 'male'

export const CATEGORIES: { k: Category; n: string; i: string }[] = [
  { k: 'top', n: '上衣', i: catTop },
  { k: 'bottom', n: '下衣', i: catBottom },
  { k: 'hat', n: '帽子', i: catHat },
  { k: 'headwear', n: '头饰', i: catHeadwear },
  { k: 'scarf', n: '围巾', i: catScarf },
  { k: 'jewel', n: '首饰', i: catJewel },
]

/** 部位默认图层序（按 CATEGORIES 顺序，数值越大越上层），未手动调整时使用 */
export const BASE_LAYER: Record<Category, number> = Object.fromEntries(
  CATEGORIES.map((c, i) => [c.k, i]),
) as Record<Category, number>

export const catName = (k: string) =>
  CATEGORIES.find((c) => c.k === k)?.n ?? k

/** 各部位在人物身上的覆盖框（百分比，基于 450×800 人物画布）。
 *  衣物按「宽度优先」适配：width 撑满锚点框（对齐人物袖展/腿宽），
 *  高度按图片比例自然延展（长西装/长裙自然下垂）；top 即锚点（肩线/腰线/头顶）。
 *  试穿台、日历回放页与导出合成共用同一套常量。 */
export const SLOT_BOX: Record<Category, { left: number; top: number; width: number }> = {
  hat: { left: 28, top: 0, width: 44 },
  headwear: { left: 34, top: 2, width: 32 },
  top: { left: 25, top: 19, width: 50 },
  bottom: { left: 32, top: 44, width: 36 },
  scarf: { left: 31, top: 14, width: 38 },
  jewel: { left: 38, top: 20, width: 24 },
}

export interface User {
  id: number
  nickname: string
  account: string
  avatar_gender: Gender
  created_at: string
}

export interface ClothingItem {
  id: number
  name: string
  category: Category
  image: string // 静态访问路径 /static/items/xxx.png
  source: string // AI / manual
  conf_cut: number
  conf_cls: number
  created_at: string
}

/** 六部位穿着快照：单件部位为衣物 id 或 null，首饰为 id 列表 */
export interface OutfitSnapshot {
  top: number | null
  bottom: number | null
  hat: number | null
  headwear: number | null
  scarf: number | null
  jewel: number[]
}

/** 衣物手动调整快照（px 偏移与缩放；z 为图层序数值，越大越上层，缺省用部位基础层序） */
export interface OutfitAdjust {
  dx: number
  dy: number
  scale: number
  z?: number
}

/** 搭配记录：一次保存 = 一条记录，同一天可存多条 */
export interface OutfitRecord {
  id: number
  worn_date: string // YYYY-MM-DD，用户本地日期
  gender: Gender
  items: OutfitSnapshot
  adjustments: Record<string, OutfitAdjust>
  created_at: string
  updated_at: string
}
