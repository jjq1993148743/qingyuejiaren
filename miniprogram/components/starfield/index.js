// components/starfield/index.js
// 性能优化：星星数据只在首次生成，后续页面复用缓存
let cachedStars = null

Component({
  properties: {
    showMoon: {
      type: Boolean,
      value: false
    }
  },

  data: {
    stars: [],
    shootingStar: null
  },

  lifetimes: {
    attached() {
      // 复用缓存的星星数据，避免每次切换Tab都重新生成
      if (cachedStars) {
        this.setData({ stars: cachedStars })
      } else {
        this.generateStars()
      }
      this.startShootingStars()
    },

    detached() {
      if (this._shootingTimer) {
        clearInterval(this._shootingTimer)
        this._shootingTimer = null
      }
    }
  },

  methods: {
    generateStars() {
      const stars = []
      for (let i = 0; i < 80; i++) { // 从120减少到80，减少DOM节点
        stars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.floor(Math.random() * 3) + 1,
          opacity: (Math.random() * 0.7 + 0.3).toFixed(2),
          duration: (Math.random() * 3 + 2).toFixed(1),
          delay: (Math.random() * 5).toFixed(1)
        })
      }
      cachedStars = stars // 缓存
      this.setData({ stars })
    },

    startShootingStars() {
      // 降低流星频率，减少动画开销
      this._shootingTimer = setInterval(() => {
        this.triggerShootingStar()
      }, 20000) // 每20秒一颗

      // 首次8秒后触发
      setTimeout(() => {
        this.triggerShootingStar()
      }, 8000)
    },

    triggerShootingStar() {
      const star = {
        startX: Math.random() * 50 + 10,
        startY: Math.random() * 30,
        id: Date.now()
      }
      this.setData({ shootingStar: star })

      setTimeout(() => {
        this.setData({ shootingStar: null })
      }, 1500)
    }
  }
})
