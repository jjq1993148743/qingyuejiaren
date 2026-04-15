// pages/index/index.js
const app = getApp()

// 里程碑配置
const MILESTONES = [
  { days: 1, label: '初心', icon: '💕', reached: false },
  { days: 7, label: '一周之约', icon: '🌱', reached: false },
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
    days: 0,
    moonText: '🌙',
    sunText: '🌞',
    milestones: [],
    currentMilestone: null,
    showFirework: false,
    homeExpanded: false,
    // 固定文案
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
    ]
  },

  onLoad() {
    this.calcDays()
    // 首次进入自动播放音乐
    if (!app.globalData.musicPlaying) {
      app.playMusic()
    }
  },

  onShow() {
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

    // 找当前最近的已达成里程碑
    let currentMilestone = null
    for (let i = milestones.length - 1; i >= 0; i--) {
      if (milestones[i].reached) {
        currentMilestone = milestones[i]
        break
      }
    }

    // 检查是否是里程碑日（当天恰好=某个里程碑）
    const exactMilestone = MILESTONES.find(m => m.days === days)
    const isMilestoneDay = !!exactMilestone

    this.setData({
      days,
      milestones,
      currentMilestone,
      isMilestoneDay,
      exactMilestone: exactMilestone || null
    })

    // 里程碑日首次打开放烟花
    if (isMilestoneDay) {
      const lastFireworkDate = wx.getStorageSync('lastFireworkDate') || ''
      const today = new Date().toDateString()
      if (lastFireworkDate !== today) {
        wx.setStorageSync('lastFireworkDate', today)
        this.triggerFirework()
      }
    }
  },

  triggerFirework() {
    this.setData({ showFirework: true })
    setTimeout(() => {
      this.setData({ showFirework: false })
    }, 3000)
  },

  onMilestoneTap(e) {
    const idx = e.currentTarget.dataset.index
    const m = this.data.milestones[idx]
    if (m.reached) {
      this.triggerFirework()
    }
  },

  toggleHome() {
    this.setData({ homeExpanded: !this.data.homeExpanded })
  }
})
