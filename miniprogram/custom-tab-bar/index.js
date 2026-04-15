// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '我们的家', icon: '🏠', activeIcon: '🏠' },
      { pagePath: '/pages/story-wall/story-wall', text: '故事墙', icon: '🎭', activeIcon: '🎭' },
      { pagePath: '/pages/our-story/our-story', text: '我们的故事', icon: '📝', activeIcon: '📝' },
      { pagePath: '/pages/little-days/little-days', text: '小日子', icon: '📅', activeIcon: '📅' }
    ]
  },

  methods: {
    switchTab(e) {
      const idx = e.currentTarget.dataset.index
      const item = this.data.list[idx]
      wx.switchTab({ url: item.pagePath })
    }
  }
})
