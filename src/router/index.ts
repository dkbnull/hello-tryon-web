/** 路由：登录守卫 + 元信息 */
import { createRouter, createWebHistory } from 'vue-router'
import { getToken, setUnauthorizedHandler } from '@/api/client'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, title: '登录' },
    },
    {
      path: '/',
      name: 'wardrobe',
      component: () => import('@/views/WardrobeView.vue'),
      meta: { title: '我的衣橱', tab: true },
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('@/views/UploadView.vue'),
      meta: { title: '上传衣物' },
    },
    {
      path: '/items/:id',
      name: 'item-detail',
      component: () => import('@/views/ItemDetailView.vue'),
      meta: { title: '衣物详情' },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { title: '个人信息', tab: true },
    },
    {
      path: '/password',
      name: 'password',
      component: () => import('@/views/ChangePasswordView.vue'),
      meta: { title: '修改密码' },
    },
    {
      path: '/avatar',
      name: 'avatar',
      component: () => import('@/views/AvatarView.vue'),
      meta: { title: '选择虚拟人物' },
    },
    {
      path: '/tryon',
      name: 'tryon',
      component: () => import('@/views/TryonView.vue'),
      meta: { title: '搭配试穿', tab: true },
    },
  ],
})

router.beforeEach((to) => {
  if (!to.meta.public && !getToken()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  document.title = `穿了么 · ${to.meta.title ?? ''}`
})

setUnauthorizedHandler(() => {
  // 401 跳登录时携带当前页面路径，登录后可回到原页面
  const cur = router.currentRoute.value
  if (cur.name !== 'login') {
    router.push({ name: 'login', query: { redirect: cur.fullPath } })
  }
})

export default router
