// pages/story-wall/story-wall.js
const db = wx.cloud.database()
const app = getApp()

// 里程碑配置
const MILESTONES = [
  { days: 1, label: '初心', icon: '💕', reached: false },
  { days: 7, label: '一周之约', icon: '🌱', reached: false },
  { days: 20, label: '二十日情', icon: '🎀', reached: false },
  { days: 30, label: '一月相伴', icon: '🌸', reached: false },
  { days: 60, label: '两月相知', icon: '🌺', reached: false },
  { days: 100, label: '百日情深', icon: '💯', reached: false },
  { days: 200, label: '两百夜思念', icon: '🌙', reached: false },
  { days: 365, label: '一年长情', icon: '🎊', reached: false },
  { days: 520, label: '我爱你', icon: '💗', reached: false },
  { days: 730, label: '两周年', icon: '🌹', reached: false },
  { days: 1000, label: '千日之恋', icon: '✨', reached: false },
  { days: 1314, label: '一生一世', icon: '💍', reached: false }
]

Page({
  data: {
    stories: [],
    loading: true,
    emptyText: '快来完成第一个心愿吧~',
    // 编辑弹窗
    showEditModal: false,
    editingItem: null,
    // 我们的家
    ourHome: [
      '是温暖的',
      '是安全的',
      '是不急不躁的',
      '是在路上期待的',
      '是你肆意妄为的',
      '是我为你收拾心情的',
      '是别人都羡慕的，期待的',
      '是没有敷衍的，是真诚的',
      '是没有隔阂，是全心全意的',
      '是包容的，是我们都愿意回顾的',
      '是有平淡无奇中能够发现惊喜的',
      '是到处都充满着你被呵护的片段的',
      '是在柴米油盐中能够开出浪漫花朵的',
      '是能在别人所谓的"七年之痒"中仍有激情与情调的'
    ],
    visibleHome: [],
    // 在一起天数 + 里程碑
    days: 0,
    milestones: [],
    currentMilestone: null
  },

  onLoad() {
    this.loadStories()
    this.setData({ visibleHome: this.data.ourHome })
    this.calcDays()
    // 自动播放背景音乐
    if (!app.globalData.musicPlaying) {
      app.playMusic()
    }
  },

  onShow() {
    this.loadStories()
    this.calcDays()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  calcDays() {
    const start = app.globalData.startDate
    const now = new Date()
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24))
    const days = Math.max(diff, 0)

    const milestones = MILESTONES.map(m => ({
      ...m,
      reached: days >= m.days
    }))

    let currentMilestone = null
    for (let i = milestones.length - 1; i >= 0; i--) {
      if (milestones[i].reached) {
        currentMilestone = milestones[i]
        break
      }
    }

    this.setData({ days, milestones, currentMilestone })
  },

  async loadStories() {
    try {
      const res = await db.collection('stories')
        .where({ status: 'completed' })
        .orderBy('wishDate', 'desc')
        .get()

      const stories = res.data.map(s => ({
        ...s,
        dateStr: this.formatDate(s.completedAt),
        previewText: s.feeling ? s.feeling.slice(0, 30) + (s.feeling.length > 30 ? '...' : '') : '',
        tempImages: []
      }))

      // 批量获取图片临时链接
      const allFileIds = []
      stories.forEach(s => {
        if (s.images && s.images.length > 0) {
          allFileIds.push(...s.images)
        }
      })

      if (allFileIds.length > 0) {
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: allFileIds })
          const urlMap = {}
          urlRes.fileList.forEach(f => {
            // 只保留获取成功的临时链接，过滤掉cloud://回退（previewImage不支持）
            if (f.status === 0 && f.tempFileURL) {
              urlMap[f.fileID] = f.tempFileURL
            }
          })
          stories.forEach(s => {
            if (s.images && s.images.length > 0) {
              s.tempImages = s.images.map(id => urlMap[id]).filter(Boolean)
            }
          })
        } catch (err) {
          console.error('获取图片链接失败', err)
          stories.forEach(s => {
            s.tempImages = s.images || []
          })
        }
      }

      this.setData({ stories, loading: false })
    } catch (err) {
      console.error('加载故事失败', err)
      this.setData({ loading: false })
    }
  },

  formatDate(timestamp) {
    if (!timestamp) return ''
    let dateStr = ''
    if (typeof timestamp === 'string' && timestamp.length >= 10) {
      dateStr = timestamp.slice(0, 10)
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
      }
    }
    const d = new Date(timestamp)
    if (!isNaN(d.getTime())) {
      return `${d.getMonth() + 1}月${d.getDate()}日`
    }
    return dateStr
  },

  async onStoryTap(e) {
    const id = e.currentTarget.dataset.id
    const story = this.data.stories.find(s => s._id === id)
    if (!story) return

    this.setData({
      showEditModal: true,
      editingItem: story  // tempImages 已在 loadStories 中获取
    })
  },

  preventBubble() {},

  onEditClose() {
    this.setData({ showEditModal: false, editingItem: null })
  },

  async onEditSubmit(e) {
    const data = e.detail
    const updateData = {
      title: data.title,
      wishDate: data.wishDate
    }

    if (data.feeling !== undefined) {
      updateData.feeling = data.feeling
    }

    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt
    }

    try {
      await db.collection('stories').doc(data._id).update({ data: updateData })
      wx.showToast({ title: '已更新', icon: 'none' })
      this.setData({ showEditModal: false, editingItem: null })
      getApp().globalData.storiesDirty = true
      this.loadStories()
    } catch (err) {
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  async onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    const urls = e.currentTarget.dataset.urls
    if (!url || !urls || urls.length === 0) return

    // 尝试直接预览，如果链接可能过期则刷新后预览
    try {
      wx.previewImage({ current: url, urls: urls })
    } catch (err) {
      // 预览失败，重新加载故事获取新链接
      await this.loadStories()
      const story = this.data.stories.find(s => s.tempImages && s.tempImages.includes(url))
      if (story && story.tempImages.length > 0) {
        const newUrl = story.tempImages[story.tempImages.indexOf(url)] || story.tempImages[0]
        wx.previewImage({ current: newUrl, urls: story.tempImages })
      }
    }
  },


})
