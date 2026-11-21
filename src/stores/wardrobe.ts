/** 衣橱数据 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import type { Category, ClothingItem } from '@/types'

export const useWardrobeStore = defineStore('wardrobe', () => {
  const items = ref<ClothingItem[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      items.value = await api.listItems()
    } finally {
      loading.value = false
    }
  }

  async function remove(id: number) {
    await api.deleteItem(id)
    items.value = items.value.filter((i) => i.id !== id)
  }

  async function update(id: number, data: { name?: string; category?: Category }) {
    const updated = await api.updateItem(id, data)
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx > -1) items.value[idx] = updated
    return updated
  }

  function byCategory(category: Category) {
    return items.value.filter((i) => i.category === category)
  }

  function find(id: number) {
    return items.value.find((i) => i.id === id)
  }

  return { items, loading, load, remove, update, byCategory, find }
})
