<div align="center">
  <img src="src/assets/logo.png" width="120" alt="穿了么 LOGO">
  <h1>穿了么 · Hello Tryon</h1>
  <p>
    <a href="https://github.com/dkbnull/hello-tryon-web"><img src="https://img.shields.io/badge/GitHub-hello--tryon--web-181717?logo=github" alt="GitHub"></a>
    <a href="https://gitee.com/dkbnull/hello-tryon-web"><img src="https://img.shields.io/badge/Gitee-hello--tryon--web-C71D23?logo=gitee" alt="Gitee"></a>
    <a href="https://github.com/dkbnull/hello-tryon-server"><img src="https://img.shields.io/badge/Backend-hello--tryon--server-009688?logo=fastapi" alt="Backend"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-D22128?logo=apache" alt="Apache 2.0"></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs" alt="Vue 3.5">
    <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite" alt="Vite 8">
    <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript" alt="TypeScript 5.5">
    <img src="https://img.shields.io/badge/Pinia-2-FFD859?logo=pinia" alt="Pinia 2">
    <img src="https://img.shields.io/badge/Vue_Router-4-42B883?logo=vuerouter" alt="Vue Router 4">
  </p>
</div>

## 项目简介

「穿了么」前端应用：用户拍照上传衣物，AI 自动抠图分类后存入个人衣橱，并在虚拟人物上进行 2D 分层搭配试穿。

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3（`<script setup>` 组合式 API） |
| 构建 | Vite 8 |
| 语言 | TypeScript |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |

## 快速开始

### 环境要求

- Node.js ≥ 20
- 后端服务已启动

### 安装与运行

```bash
npm install
npm run dev
```

启动后访问 <http://localhost:5173>。开发服务器将 `/api` 与 `/static` 请求代理至 `http://127.0.0.1:8000`（见 [vite.config.ts](vite.config.ts)），需保证后端运行在该地址。

### 构建与预览

```bash
npm run build
npm run preview
```

构建产物输出至 `dist/`。生产部署时由 Nginx 反代 `/api` 与 `/static` 至后端，前端静态文件直接托管。

## 页面结构

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录 / 注册 | 不开放注册，需邀请码 |
| `/` | 我的衣橱 | 分类浏览，底部导航入口 |
| `/upload` | 上传衣物 | 拍照/选图 → AI 处理 → 手动旋转 → 确认入库 |
| `/items/:id` | 衣物详情 | 改名、改分类、删除 |
| `/tryon` | 搭配试穿 | 虚拟人物 2D 分层试穿，支持拖拽/缩放，底部导航入口 |
| `/profile` | 个人信息 | 性别维护（决定试穿人物），底部导航入口 |
| `/password` | 修改密码 | 独立页面，含密码强度提示 |
| `/avatar` | 选择虚拟人物 | 甜甜（女）/ 空空（男） |

## 目录结构

```
src/
├── api/            # 请求封装与业务 API（统一 401 处理）
├── stores/         # Pinia：auth 登录态 / wardrobe 衣橱 / tryon 试穿会话
├── router/         # 路由与登录守卫
├── composables/    # toast 全局提示
├── components/     # 通用组件（密码强度、确认弹窗、缩略图等）
├── views/          # 页面（8 个）
├── assets/         # 图标、人物插画、LOGO
└── types.ts        # 分类枚举与类型定义
```

## 关键约定

- 试穿适配：衣物按宽度优先缩放，以锚点框宽度为基准适配，高度按原始比例延展。
- 登录失效：接口返回 401 时自动清理 token 并跳转登录页，登录后回到原页面。
- 退出登录：同时清空衣橱与试穿会话状态，避免换账号串号。
- 动效：遵循换装动效规格，并遵循 `prefers-reduced-motion`。

## 演示账号

```
账号：demo@tryon.cn
密码：Demo@12345
```
