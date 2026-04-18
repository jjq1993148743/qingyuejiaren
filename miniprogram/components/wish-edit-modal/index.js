// components/wish-edit-modal/index.js
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    item: {
      type: Object,
      value: null
    }
  },

  data: {
    title: '',
    date: '',
    completedDate: '',
    feeling: '',
    images: [],
    isCompleted: false
  },

  observers: {
    'item'(val) {
      if (val) {
        // 完成时间：有completedAt就用，没有则默认今天
        let completedDate = ''
        if (val.status === 'completed') {
          if (val.completedAt) {
            // completedAt可能是 "2026-04-18" 字符串或 Date 对象
            const raw = val.completedAt
            if (typeof raw === 'string' && raw.length >= 10) {
              // 直接取前10位即 YYYY-MM-DD
              completedDate = raw.slice(0, 10)
            } else {
              // Date对象或serverDate，用new Date解析
              const d = new Date(raw)
              if (!isNaN(d.getTime())) {
                const y = d.getFullYear()
                const m = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                completedDate = `${y}-${m}-${day}`
              }
            }
          }
          // 如果解析失败，默认今天
          if (!completedDate) {
            const now = new Date()
            const y = now.getFullYear()
            const m = String(now.getMonth() + 1).padStart(2, '0')
            const day = String(now.getDate()).padStart(2, '0')
            completedDate = `${y}-${m}-${day}`
          }
        }
        this.setData({
          title: val.title || '',
          date: val.wishDate || '',
          completedDate: completedDate,
          feeling: val.feeling || '',
          images: val.tempImages || val._tempImages || [],
          isCompleted: val.status === 'completed' || val.type === 'completed'
        })
      }
    }
  },

  methods: {
    preventBubble() {},

    onTitleInput(e) { this.setData({ title: e.detail.value }) },
    onDateInput(e) { this.setData({ date: e.detail.value }) },
    onCompletedDateInput(e) { this.setData({ completedDate: e.detail.value }) },
    onFeelingInput(e) { this.setData({ feeling: e.detail.value }) },

    onPreviewImage(e) {
      const url = e.currentTarget.dataset.url
      if (!url) return
      // 过滤掉无效链接（cloud://等previewImage不支持的协议）
      const validUrls = this.data.images.filter(u => u && u.startsWith('http'))
      if (validUrls.length === 0) return
      wx.previewImage({ current: url.startsWith('http') ? url : validUrls[0], urls: validUrls })
    },

    onClose() {
      this.triggerEvent('close')
    },

    onSubmit() {
      if (!this.data.title.trim()) {
        wx.showToast({ title: '愿望不能为空', icon: 'none' })
        return
      }
      if (!this.data.date) {
        wx.showToast({ title: '请选择日期', icon: 'none' })
        return
      }

      const item = this.properties.item
      const updateData = {
        _id: item._id,
        title: this.data.title.trim(),
        wishDate: this.data.date
      }

      if (this.data.isCompleted) {
        updateData.feeling = this.data.feeling.trim()
        // 只有真正有值才传 completedAt，空字符串不传
        if (this.data.completedDate) {
          updateData.completedAt = this.data.completedDate
        }
      }

      this.triggerEvent('submit', updateData)
    }
  }
})
