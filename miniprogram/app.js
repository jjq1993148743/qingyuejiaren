// app.js
App({
  onLaunch: function () {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'ai-native-0gci58pr08c95d4c',
        traceUser: true
      })
    }

    // 全局音乐管理
    this.globalData.musicPlaying = false
    this.globalData.musicContext = null
    this.globalData.musicTempUrl = ''
    this.globalData.musicCloudId = 'cloud://ai-native-0gci58pr08c95d4c.music/videoplayback.m4a'
  },

  // 获取音乐临时链接（cloud:// 不能直接给 InnerAudioContext 用，需转换）
  _getMusicUrl: function () {
    return new Promise((resolve) => {
      // 已有缓存直接返回
      if (this.globalData.musicTempUrl) {
        resolve(this.globalData.musicTempUrl)
        return
      }

      if (!this.globalData.musicCloudId) {
        console.error('音乐 cloudId 未配置')
        resolve('')
        return
      }

      console.log('正在获取音乐临时链接...', this.globalData.musicCloudId)
      wx.cloud.getTempFileURL({
        fileList: [this.globalData.musicCloudId],
        success: (res) => {
          console.log('getTempFileURL 返回:', JSON.stringify(res))
          if (res.fileList && res.fileList.length > 0) {
            const file = res.fileList[0]
            if (file.status === 0 && file.tempFileURL) {
              this.globalData.musicTempUrl = file.tempFileURL
              console.log('音乐临时链接获取成功:', file.tempFileURL)
              resolve(file.tempFileURL)
            } else {
              console.error('获取音乐临时链接失败, status:', file.status, 'errMsg:', file.errMsg)
              resolve('')
            }
          } else {
            console.error('fileList为空', res)
            resolve('')
          }
        },
        fail: (err) => {
          console.error('getTempFileURL调用失败:', err)
          resolve('')
        }
      })
    })
  },

  // 全局音乐控制
  playMusic: function () {
    if (!this.globalData.musicCloudId) {
      console.warn('音乐文件未配置')
      return
    }

    // 如果还没创建播放器
    if (!this.globalData.musicContext) {
      this._getMusicUrl().then(url => {
        if (!url) {
          console.error('无法获取音乐URL，播放失败')
          return
        }

        const ctx = wx.createInnerAudioContext()
        ctx.src = url
        ctx.loop = true
        ctx.volume = 0.6
        ctx.onPlay(() => {
          console.log('音乐开始播放')
          this.globalData.musicPlaying = true
          this._notifyMusicState()
        })
        ctx.onPause(() => {
          console.log('音乐暂停')
          this.globalData.musicPlaying = false
          this._notifyMusicState()
        })
        ctx.onError((err) => {
          console.error('音乐播放错误:', err.errMsg, err.errCode)
          // URL可能过期，清除缓存重试
          this.globalData.musicTempUrl = ''
          this.globalData.musicContext = null
          this.globalData.musicPlaying = false
          this._notifyMusicState()
        })
        ctx.onStop(() => {
          this.globalData.musicPlaying = false
          this._notifyMusicState()
        })

        this.globalData.musicContext = ctx
        ctx.play()
      })
      return
    }

    // 已有播放器，直接播放
    this.globalData.musicContext.play()
    this.globalData.musicPlaying = true
    this._notifyMusicState()
  },

  pauseMusic: function () {
    if (this.globalData.musicContext) {
      this.globalData.musicContext.pause()
    }
    this.globalData.musicPlaying = false
    this._notifyMusicState()
  },

  toggleMusic: function () {
    if (this.globalData.musicPlaying) {
      this.pauseMusic()
    } else {
      this.playMusic()
    }
  },

  _notifyMusicState: function () {
    const callbacks = this.globalData.musicCallbacks || []
    callbacks.forEach(cb => {
      try { cb(this.globalData.musicPlaying) } catch (e) { }
    })
  },

  onMusicStateChange: function (callback) {
    if (!this.globalData.musicCallbacks) {
      this.globalData.musicCallbacks = []
    }
    this.globalData.musicCallbacks.push(callback)
    return this.globalData.musicPlaying
  },

  offMusicStateChange: function (callback) {
    if (this.globalData.musicCallbacks) {
      this.globalData.musicCallbacks = this.globalData.musicCallbacks.filter(cb => cb !== callback)
    }
  },

  globalData: {
    startDate: new Date(2026, 2, 27), // 2026年3月27日 (月份0-indexed)
    musicPlaying: false,
    musicContext: null,
    musicTempUrl: '',
    musicCloudId: 'cloud://ai-native-0gci58pr08c95d4c.music/videoplayback.m4a',
    musicCallbacks: []
  }
})
