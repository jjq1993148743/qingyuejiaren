// components/music-player/index.js
const app = getApp()

Component({
  data: {
    isPlaying: false
  },

  lifetimes: {
    attached() {
      // 保存回调引用，方便detach时移除
      this._onStateChange = this._onStateChange.bind(this)
      const state = app.onMusicStateChange(this._onStateChange)
      this.setData({ isPlaying: state })
    },
    detached() {
      app.offMusicStateChange(this._onStateChange)
    }
  },

  methods: {
    _onStateChange(playing) {
      this.setData({ isPlaying: playing })
    },

    onToggle() {
      app.toggleMusic()
    }
  }
})
