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

export const catName = (k: string) =>
  CATEGORIES.find((c) => c.k === k)?.n ?? k

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
