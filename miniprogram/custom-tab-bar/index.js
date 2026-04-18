// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/story-wall/story-wall', text: '故事墙' },
      { pagePath: '/pages/our-story/our-story', text: '愿望清单' },
      { pagePath: '/pages/little-days/little-days', text: '日历' }
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
