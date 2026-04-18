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
    desc: '',
    feeling: '',
    images: [],
    isCompleted: false
  },

  observers: {
    'item'(val) {
      if (val) {
        this.setData({
          title: val.title || '',
          date: val.wishDate || '',
          desc: val.description || '',
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
    onDescInput(e) { this.setData({ desc: e.detail.value }) },
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
        wx.showToast({ title: '标题不能为空', icon: 'none' })
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
        description: this.data.desc.trim(),
        wishDate: this.data.date
      }

      if (this.data.isCompleted) {
        updateData.feeling = this.data.feeling.trim()
      }

      this.triggerEvent('submit', updateData)
    }
  }
})
