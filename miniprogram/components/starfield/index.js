// components/starfield/index.js
Component({
  properties: {
    showMoon: {
      type: Boolean,
      value: false
    }
  },

  data: {
    stars: [],
    shootingStar: null,
    shootingTimer: null
  },

  lifetimes: {
    attached() {
      this.generateStars()
      this.startShootingStars()
    },
    detached() {
      if (this.data.shootingTimer) {
        clearInterval(this.data.shootingTimer)
      }
    }
  },

  methods: {
    generateStars() {
      const stars = []
      for (let i = 0; i < 120; i++) {
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
      this.setData({ stars })
    },

    startShootingStars() {
      const timer = setInterval(() => {
        this.triggerShootingStar()
      }, (Math.random() * 15 + 15) * 1000)

      this.setData({ shootingTimer: timer })

      // 首次5秒后触发一颗
      setTimeout(() => {
        this.triggerShootingStar()
      }, 5000)
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
