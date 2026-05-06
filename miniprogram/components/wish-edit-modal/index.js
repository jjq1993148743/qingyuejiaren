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
    },
    isAdd: {
      type: Boolean,
      value: false
    },
    defaultDate: {
      type: String,
      value: ''
    }
  },

  data: {
    title: '',
    date: '',
    completedDate: '',
    feeling: '',
    images: [],
    originFileIds: [],
    removedFileIds: [],
    newImages: [],
    submitting: false
  },

  observers: {
    'visible'(val) {
      if (val && this.properties.isAdd) {
        const now = new Date()
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        this.setData({
          title: '',
          date: this.properties.defaultDate || today,
          completedDate: '',
          feeling: '',
          images: [],
          originFileIds: [],
          removedFileIds: [],
          newImages: []
        })
      }
    },
    'item'(val) {
      if (val) {
        const now = new Date()
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

        let completedDate = ''
        if (val.completedAt) {
          const raw = val.completedAt
          if (typeof raw === 'string' && raw.length >= 10) {
            completedDate = raw.slice(0, 10)
          } else {
            const d = new Date(raw)
            if (!isNaN(d.getTime())) {
              const y = d.getFullYear()
              const m = String(d.getMonth() + 1).padStart(2, '0')
              const day = String(d.getDate()).padStart(2, '0')
              completedDate = `${y}-${m}-${day}`
            }
          }
        }

        // 图片：展示URL + 原始 cloudID
        const displayImages = val.tempImages || val._tempImages || []
        const cloudFileIds = val.images || []
        const originFileIds = displayImages.map((url, i) => {
          if (cloudFileIds[i]) return cloudFileIds[i]
          return null
        })

        this.setData({
          title: val.title || '',
          date: val.wishDate || today,
          completedDate: completedDate,
          feeling: val.feeling || '',
          images: displayImages,
          originFileIds: originFileIds,
          removedFileIds: [],
          newImages: []
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
      const urls = e.currentTarget.dataset.urls || this.data.images
      if (!url) return
      const validUrls = urls.filter(u => u && (u.startsWith('http') || u.startsWith('wxfile')))
      if (validUrls.length === 0) return
      wx.previewImage({ current: url, urls: validUrls })
    },

    onChooseImage() {
      const remaining = 9 - this.data.images.length
      if (remaining <= 0) {
        wx.showToast({ title: '最多9张图片', icon: 'none' })
        return
      }
      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sizeType: ['compressed'],
        success: (res) => {
          const newPaths = res.tempFiles.map(f => f.tempFilePath)
          this.setData({
            images: [...this.data.images, ...newPaths],
            originFileIds: [...this.data.originFileIds, ...newPaths.map(() => null)],
            newImages: [...this.data.newImages, ...newPaths]
          })
        }
      })
    },

    onRemoveImage(e) {
      const idx = e.currentTarget.dataset.index
      const originFileId = this.data.originFileIds[idx]
      const removedFileIds = [...this.data.removedFileIds]
      if (originFileId) {
        removedFileIds.push(originFileId)
      }
      this.setData({
        images: this.data.images.filter((_, i) => i !== idx),
        originFileIds: this.data.originFileIds.filter((_, i) => i !== idx),
        removedFileIds,
        newImages: this.data.newImages.filter(img => {
          return this.data.images[idx] !== img
        })
      })
      const keptNew = this.data.newImages.filter(img => this.data.images.includes(img))
      this.setData({ newImages: keptNew })
    },

    onClose() {
      if (this.data.submitting) return
      this.triggerEvent('close')
    },

    async onSubmit() {
      if (!this.data.title.trim()) {
        wx.showToast({ title: '写点啥吧~', icon: 'none' })
        return
      }

      // 新建模式
      if (this.properties.isAdd) {
        this.setData({ submitting: true })
        try {
          // 上传图片
          let imageIds = []
          if (this.data.newImages.length > 0) {
            const uploadPromises = this.data.newImages.map((img, i) => {
              const ext = img.split('.').pop() || 'jpg'
              const cloudPath = `stories/new_${Date.now()}_${i}.${ext}`
              return wx.cloud.uploadFile({ cloudPath, filePath: img })
            })
            const results = await Promise.all(uploadPromises)
            imageIds = results.map(r => r.fileID)
          }

          this.setData({ submitting: false })

          // 判断是否已完成（有完成时间或感受或图片）
          const hasCompletedData = this.data.completedDate || this.data.feeling.trim() || imageIds.length > 0

          this.triggerEvent('add', {
            title: this.data.title.trim(),
            wishDate: this.data.date,
            completedAt: hasCompletedData ? (this.data.completedDate || this.data.date) : undefined,
            feeling: this.data.feeling.trim() || undefined,
            images: imageIds.length > 0 ? imageIds : undefined
          })
        } catch (err) {
          console.error('保存失败', err)
          this.setData({ submitting: false })
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
        return
      }

      // 编辑模式 - 统一处理
      this.setData({ submitting: true })

      try {
        const item = this.properties.item
        const updateData = {
          _id: item._id,
          title: this.data.title.trim(),
          wishDate: this.data.date,
          feeling: this.data.feeling.trim() || undefined,
          completedAt: this.data.completedDate || undefined
        }

        // 删除被移除的云存储图片
        if (this.data.removedFileIds.length > 0) {
          await wx.cloud.deleteFile({ fileList: this.data.removedFileIds }).catch(() => {})
        }

        // 上传新图片
        let newFileIds = []
        if (this.data.newImages.length > 0) {
          const uploadPromises = this.data.newImages.map((img, i) => {
            const ext = img.split('.').pop() || 'jpg'
            const cloudPath = `stories/${item._id}_new_${i}_${Date.now()}.${ext}`
            return wx.cloud.uploadFile({ cloudPath, filePath: img })
          })
          const uploadResults = await Promise.all(uploadPromises)
          newFileIds = uploadResults.map(r => r.fileID)
        }

        // 合并图片：保留的原始 cloudID + 新上传的 cloudID
        const keptFileIds = this.data.originFileIds.filter(id => id !== null)
        updateData.images = [...keptFileIds, ...newFileIds]

        this.setData({ submitting: false })
        this.triggerEvent('submit', updateData)
      } catch (err) {
        console.error('保存失败', err)
        this.setData({ submitting: false })
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  }
})
