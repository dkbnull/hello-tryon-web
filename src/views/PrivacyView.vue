<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

/** 有浏览历史则返回上一页，否则回首页 */
function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace('/')
}
</script>

<template>
  <div class="page">
    <div class="appnav">
      <button class="back" aria-label="返回" @click="goBack">‹</button>
      <span class="title">用户隐私协议</span>
    </div>

    <div class="page-body policy-body">
      <p class="update">生效日期：2026 年 11 月 24 日</p>

      <p class="intro">
        「穿了么」（以下简称"本应用"）非常重视你的个人信息保护。本协议向你说明我们如何收集、使用、存储和保护你的个人信息，以及你享有的相关权利。请在使用本应用前仔细阅读本协议，使用本应用即表示你已理解并同意本协议的全部内容。
      </p>

      <h2>一、我们收集的信息</h2>
      <ul>
        <li><b>账号信息</b>：注册时提供的手机号或邮箱、昵称、密码，以及可选填写的邀请码。</li>
        <li><b>偏好信息</b>：你在个人信息页设置的虚拟人物性别。</li>
        <li><b>衣物照片</b>：你主动拍摄或从相册上传的衣物照片，以及经处理生成的抠图结果。</li>
        <li><b>设备信息</b>：使用拍照功能时，仅在你授权后调用设备摄像头，照片仅在本地抓帧后由你确认上传。</li>
      </ul>

      <h2>二、我们如何使用信息</h2>
      <ul>
        <li>账号与密码用于身份验证和登录状态维持，登录凭证通过令牌（Token）机制下发。</li>
        <li>衣物照片经 AI 抠图与自动分类处理后，存入你的个人衣橱，仅用于试穿展示与搭配功能。</li>
        <li>上传的照片会经过缩放、方向摆正等预处理，原始照片中的位置信息（EXIF）不会保留在衣橱展示图中。</li>
        <li>我们不会将你的个人信息或衣物照片用于广告投放、用户画像或与衣橱功能无关的其他用途。</li>
      </ul>

      <h2>三、信息的存储与保护</h2>
      <ul>
        <li>你的信息存储于本应用服务器，衣物图片仅保存在应用自己的存储目录中。</li>
        <li>密码经单向加密（哈希）后存储，任何人（包括管理员）均无法查看你的明文密码。</li>
        <li>数据传输采用 HTTPS 加密通道（正式部署环境下）。</li>
        <li>AI 抠图处理在本应用服务器上完成，你的照片不会被提交给任何第三方 AI 服务。</li>
        <li>我们采取访问控制、最小权限等安全措施防止数据被未经授权访问、泄露或损毁。</li>
      </ul>

      <h2>四、信息的共享</h2>
      <p>我们不会向任何第三方出售、出租或公开提供你的个人信息。除法律法规要求或经你明确授权外，你的信息仅保存在本应用内部。</p>

      <h2>五、你的权利</h2>
      <ul>
        <li><b>查看与修改</b>：你可以在「个人信息」页随时查看并修改昵称、虚拟人物性别。</li>
        <li><b>删除</b>：你可以在衣橱中随时删除任意衣物，删除后对应图片将被一并移除。</li>
        <li><b>退出登录</b>：你可以在「个人信息」页退出登录，登录状态即时失效。</li>
        <li><b>账号注销</b>：你可以在「个人信息」页申请注销账号。提交后进入 7 天冷静期，期间再次登录将自动取消注销；冷静期结束后，账号及全部个人数据（含衣物照片）将被彻底删除且无法恢复。</li>
      </ul>

      <h2>六、未成年人保护</h2>
      <p>本应用面向一般用户。若你是未满 14 周岁的未成年人，请在监护人陪同下阅读本协议，并在取得监护人同意后使用本应用。</p>

      <h2>七、协议的变更</h2>
      <p>我们可能适时更新本协议。协议发生重大变更时，我们将在应用内以显著方式告知你。若你继续使用本应用，即视为同意更新后的协议。</p>

      <h2>八、联系我们</h2>
      <p>如对本协议或个人信息保护有任何疑问、意见或投诉，请通过邮箱 <b>xxx@xxx.cn</b> 与我们联系，我们将在 15 个工作日内答复。</p>
    </div>
  </div>
</template>

<style scoped>
.policy-body { padding: 18px 20px 34px; }
.update { font-size: 12px; color: var(--muted); margin-bottom: 12px; }
.intro { font-size: 13px; color: var(--muted); margin-bottom: 16px; }
.policy-body h2 { font-size: 15px; margin: 18px 0 8px; }
.policy-body p, .policy-body li { font-size: 13px; line-height: 1.8; }
.policy-body ul { padding-left: 18px; }
.policy-body li { margin-bottom: 4px; }
.policy-body b { color: var(--text); }
</style>
