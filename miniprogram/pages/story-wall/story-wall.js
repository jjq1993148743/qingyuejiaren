// pages/story-wall/story-wall.js
const db = wx.cloud.database()

Page({
  data: {
    stories: [],
    loading: true,
    emptyText: '快来完成第一个心愿吧~'
  },

  onLoad() {
    this.loadStories()
  },

  onShow() {
    this.loadStories()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  async loadStories() {
    try {
      const res = await db.collection('stories')
        .where({ status: 'completed' })
        .orderBy('completedAt', 'desc')
        .get()
      
      const stories = res.data.map(s => ({
        ...s,
        dateStr: this.formatDate(s.completedAt),
        previewText: s.feeling ? s.feeling.slice(0, 30) + (s.feeling.length > 30 ? '...' : '') : '',
        coverImage: s.images && s.images.length > 0 ? s.images[0] : ''
      }))

      this.setData({ stories, loading: false })
    } catch (err) {
      console.error('加载故事失败', err)
      this.setData({ loading: false })
    }
  },

  formatDate(timestamp) {
    if (!timestamp) return ''
    const d = new Date(timestamp)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  onStoryTap(e) {
    const id = e.currentTarget.dataset.id
    // 跳转到我们的故事tab对应条目
    wx.switchTab({
      url: '/pages/our-story/our-story',
      success: () => {
        // 通过eventChannel或globalData传递要查看的故事ID
        getApp().globalData.viewStoryId = id
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadStories().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})
