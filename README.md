# 🌙 青月佳人

恋人主题微信小程序，记录两个人的故事。

## 功能

- 🏠 **首页**：在一起天数、里程碑进度、固定浪漫文案（初见/欢喜/锁定/我们的家）
- 🎭 **故事墙**：时间线卡片展示已完成的故事，浪漫只读视图
- 📝 **我们的故事**：心愿清单 + 已完成故事，支持添加/编辑/完成/撤回
- 📅 **小日子**：日历标记故事日、例假记录与预测、里程碑日标记
- 🌌 **全局背景**：紫色星空 + 星星闪烁 + 流星 + 首页专属月亮
- 🎵 **全局音乐**：悬浮播放器，打开自动播放

## 部署步骤

### 1. 创建云开发环境

1. 用**微信开发者工具**打开本项目
2. 点击工具栏「云开发」按钮
3. 创建新环境（个人版免费），选择**上海**地域
4. 记下环境ID（格式如 `cloud1-xxxxxx`）

### 2. 配置环境ID

打开 `miniprogram/app.js`，将 `your-env-id` 替换为你的环境ID：

```javascript
wx.cloud.init({
  env: 'your-env-id', // 替换这里
  traceUser: true
})
```

### 3. 初始化数据库

1. 在微信开发者工具中，右键 `cloudfunctions/init-data` → 「上传并部署：云端安装依赖」
2. 部署完成后，右键 → 「云端测试」执行一次
3. 这会自动创建以下集合：
   - `stories` - 故事/心愿数据
   - `periods` - 例假记录
   - `settings` - 全局设置

### 4. 配置数据库安全规则

在云开发控制台 → 数据库，为每个集合设置安全规则为：

```json
{
  "read": true,
  "write": true
}
```

> 因为只有两人使用体验版，无账号概念，全部开放读写。

### 5. 上传音乐文件

1. 在云开发控制台 → 云存储，上传 `videoplayback.m4a`
2. 复制文件的 FileID（格式如 `cloud://xxxxx/videoplayback.m4a`）
3. 打开 `miniprogram/app.js`，填入 musicCloudId：

```javascript
globalData: {
  musicCloudId: 'cloud://xxxxx/videoplayback.m4a' // 替换这里
}
```

### 6. 预览测试

点击微信开发者工具的「预览」或「真机调试」即可。

## 数据结构

### stories 集合

| 字段 | 类型 | 说明 |
|------|------|------|
| title | String | 标题 |
| description | String | 描述 |
| status | String | 'todo' 或 'completed' |
| feeling | String | 完成时的感受 |
| images | Array | 图片FileID数组 |
| createdAt | Date | 创建时间 |
| completedAt | Date | 完成时间 |

### periods 集合

| 字段 | 类型 | 说明 |
|------|------|------|
| startDate | String | 例假开始日期 (YYYY-MM-DD) |
| duration | Number | 持续天数 |
| createdAt | Date | 记录时间 |

### settings 集合

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | String | 'period' |
| cycle | Number | 例假周期天数 |
| duration | Number | 例假持续天数 |
