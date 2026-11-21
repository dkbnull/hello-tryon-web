<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/toast'
import tabWardrobeLine from '@/assets/icons/tab-wardrobe_l.png'
import tabOutfitLine from '@/assets/icons/tab-outfit_l.png'
import tabProfileLine from '@/assets/icons/tab-profile_l.png'
import tabWardrobeFill from '@/assets/icons/tab-wardrobe_f.png'
import tabOutfitFill from '@/assets/icons/tab-outfit_f.png'
import tabProfileFill from '@/assets/icons/tab-profile_f.png'

const auth = useAuthStore()
const toast = useToast()
const route = useRoute()

// 仅主页面（衣橱/搭配/我的）显示底部导航
const showTab = computed(() => route.meta.tab === true)

// 有 token 时预取用户信息（路由守卫只查 token 存在性）
onMounted(() => auth.fetchMe())
</script>

<template>
  <div class="app-shell">
    <router-view />
    <nav v-if="showTab" class="tabbar">
      <router-link to="/" class="tab" exact-active-class="on">
        <i class="ic" :style="{ WebkitMaskImage: `url(${tabWardrobeLine})`, maskImage: `url(${tabWardrobeLine})` }" />
        <i class="ic fill" :style="{ WebkitMaskImage: `url(${tabWardrobeFill})`, maskImage: `url(${tabWardrobeFill})` }" />
        <span>衣橱</span>
      </router-link>
      <router-link to="/tryon" class="tab" active-class="on">
        <i class="ic" :style="{ WebkitMaskImage: `url(${tabOutfitLine})`, maskImage: `url(${tabOutfitLine})` }" />
        <i class="ic fill" :style="{ WebkitMaskImage: `url(${tabOutfitFill})`, maskImage: `url(${tabOutfitFill})` }" />
        <span>搭配</span>
      </router-link>
      <router-link to="/profile" class="tab" active-class="on">
        <i class="ic" :style="{ WebkitMaskImage: `url(${tabProfileLine})`, maskImage: `url(${tabProfileLine})` }" />
        <i class="ic fill" :style="{ WebkitMaskImage: `url(${tabProfileFill})`, maskImage: `url(${tabProfileFill})` }" />
        <span>我的</span>
      </router-link>
    </nav>
    <div class="toast" :class="{ show: toast.visible.value }" role="status">
      {{ toast.message.value }}
    </div>
  </div>
</template>
