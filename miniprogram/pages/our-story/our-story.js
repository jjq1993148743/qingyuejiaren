// pages/our-story/our-story.js
const db = wx.cloud.database()

Page({
  data: {
    todos: [],
    completed: [],
    loading: true,
    showAddModal: false,
    showCompleteModal: false,
    showEditModal: false,
    // 新增表单
    newTitle: '',
    newDate: '',
    // 完成表单
    currentTodo: null,
    completedDate: '',
    feeling: '',
    images: [],
    // 编辑表单
    editingItem: null,
    editDate: '',
    editFeeling: ''
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    // 每次切回都重新加载，保持数据最新
    this.loadData()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  async loadData() {
    try {
      const [todoRes, doneRes] = await Promise.all([
        db.collection('stories').where({ status: 'todo' }).orderBy('wishDate', 'asc').get(),
        db.collection('stories').where({ status: 'completed' }).orderBy('completedAt', 'desc').get()
      ])

      this.setData({
        todos: todoRes.data,
        completed: doneRes.data.map(s => ({
          ...s,
          dateStr: this.formatDate(s.completedAt),
          imageCount: s.images ? s.images.length : 0
        })),
        loading: false
      })
      // 标记故事墙也需要刷新
      getApp().globalData.storiesDirty = true
    } catch (err) {
      console.error('加载数据失败', err)
      this.setData({ loading: false })
    }
  },

  formatDate(timestamp) {
    if (!timestamp) return ''
    // 安全解析：如果是字符串直接拆分，避免UTC偏差
    if (typeof timestamp === 'string' && timestamp.length >= 10) {
      const parts = timestamp.slice(0, 10).split('-')
      if (parts.length === 3) {
        return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
      }
    }
    const d = new Date(timestamp)
    if (!isNaN(d.getTime())) {
      return `${d.getMonth() + 1}月${d.getDate()}日`
    }
    return ''
  },

  // === 新增心愿 ===
  // 阻止事件冒泡（弹窗内容区域点击不关闭）
  preventBubble() {},

  onAddTap() {
    this.setData({ showAddModal: true, newTitle: '', newDate: '' })
  },

  onAddClose() {
    this.setData({ showAddModal: false })
  },

  onTitleInput(e) {
    this.setData({ newTitle: e.detail.value })
  },

  onDateInput(e) {
    this.setData({ newDate: e.detail.value })
  },

  async onAddSubmit() {
    if (!this.data.newTitle.trim()) {
      wx.showToast({ title: '请输入愿望', icon: 'none' })
      return
    }
    if (!this.data.newDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }

    try {
      await db.collection('stories').add({
        data: {
          title: this.data.newTitle.trim(),
          description: '',
          wishDate: this.data.newDate,
          status: 'todo',
          feeling: '',
          images: [],
          createdAt: db.serverDate(),
          completedAt: null
        }
      })

      wx.showToast({ title: '愿望已添加 🌱', icon: 'none' })
      this.setData({ showAddModal: false })
      this.loadData()
    } catch (err) {
      console.error('添加失败', err)
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  // === 标记完成 ===
  onCompleteTap(e) {
    const item = e.currentTarget.dataset.item
    // 默认完成时间为今天
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    this.setData({
      showCompleteModal: true,
      currentTodo: item,
      completedDate: today,
      feeling: '',
      images: []
    })
  },

  onCompleteClose() {
    this.setData({ showCompleteModal: false, currentTodo: null })
  },

  onFeelingInput(e) {
    this.setData({ feeling: e.detail.value })
  },

  onCompletedDateInput(e) {
    this.setData({ completedDate: e.detail.value })
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
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ images: [...this.data.images, ...newImages] })
      }
    })
  },

  onRemoveImage(e) {
    const idx = e.currentTarget.dataset.index
    const images = this.data.images.filter((_, i) => i !== idx)
    this.setData({ images })
  },

  async onCompleteSubmit() {
    if (!this.data.feeling.trim()) {
      wx.showToast({ title: '请写下这一刻的感受', icon: 'none' })
      return
    }

    const item = this.data.currentTodo
    wx.showLoading({ title: '提交中...' })

    try {
      // 上传图片到云存储
      const uploadPromises = this.data.images.map((img, i) => {
        const ext = img.split('.').pop() || 'jpg'
        const cloudPath = `stories/${item._id}_${i}_${Date.now()}.${ext}`
        return wx.cloud.uploadFile({
          cloudPath,
          filePath: img
        })
      })

      const uploadResults = await Promise.all(uploadPromises)
      const imageIds = uploadResults.map(r => r.fileID)

      await db.collection('stories').doc(item._id).update({
        data: {
          status: 'completed',
          feeling: this.data.feeling.trim(),
          images: imageIds,
          completedAt: this.data.completedDate || new Date().toISOString().slice(0, 10)
        }
      })

      wx.hideLoading()
      wx.showToast({ title: '这一刻已记录 🌸', icon: 'none' })
      this.setData({ showCompleteModal: false, currentTodo: null })
      this.loadData()
    } catch (err) {
      wx.hideLoading()
      console.error('完成记录失败', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // === 编辑（仅未完成愿望） ===
  async onEditTap(e) {
    const item = e.currentTarget.dataset.item
    let tempImages = []
    if (item.images && item.images.length > 0) {
      try {
        const res = await wx.cloud.getTempFileURL({ fileList: item.images })
        tempImages = res.fileList.filter(f => f.status === 0 && f.tempFileURL).map(f => f.tempFileURL)
      } catch (err) {
        console.error('获取图片链接失败', err)
      }
    }
    this.setData({
      showEditModal: true,
      editingItem: { ...item, tempImages }
    })
  },

  // === 预览已完成愿望 ===
  async onCompletedTap(e) {
    const item = e.currentTarget.dataset.item
    let tempImages = []
    if (item.images && item.images.length > 0) {
      try {
        const res = await wx.cloud.getTempFileURL({ fileList: item.images })
        tempImages = res.fileList.filter(f => f.status === 0 && f.tempFileURL).map(f => f.tempFileURL)
      } catch (err) {
        console.error('获取图片链接失败', err)
      }
    }
    this.setData({
      showEditModal: true,
      editingItem: { ...item, tempImages }
    })
  },

  onEditClose() {
    this.setData({ showEditModal: false, editingItem: null })
  },

  async onEditSubmit(e) {
    const data = e.detail
    const item = this.properties ? this.data.editingItem : this.data.editingItem
    const updateData = {
      title: data.title,
      wishDate: data.wishDate
    }

    if (data.feeling !== undefined) {
      updateData.feeling = data.feeling
    }

    if (data.completedAt !== undefined && data.completedAt !== '') {
      updateData.completedAt = data.completedAt
    }

    try {
      await db.collection('stories').doc(data._id).update({ data: updateData })
      wx.showToast({ title: '已更新', icon: 'none' })
      this.setData({ showEditModal: false, editingItem: null })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  // === 删除待完成 ===
  onDeleteTap(e) {
    const item = e.currentTarget.dataset.item
    wx.showModal({
      title: '',
      content: '真的要放弃这个愿望吗？',
      confirmText: '删除',
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.collection('stories').doc(item._id).remove()
            wx.showToast({ title: '已删除', icon: 'none' })
            this.loadData()
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // === 撤回完成 ===
  onRevertTap(e) {
    const item = e.currentTarget.dataset.item
    wx.showModal({
      title: '',
      content: '要重新放回愿望清单吗？感受和图片将被清空。',
      confirmText: '撤回',
      confirmColor: '#FFD700',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 删除云存储中的图片
            if (item.images && item.images.length > 0) {
              const deletePromises = item.images.map(fileId => {
                return wx.cloud.deleteFile({ fileList: [fileId] }).catch(() => {})
              })
              await Promise.all(deletePromises)
            }

            await db.collection('stories').doc(item._id).update({
              data: {
                status: 'todo',
                feeling: '',
                images: [],
                completedAt: null
              }
            })
            wx.showToast({ title: '已撤回愿望清单', icon: 'none' })
            this.loadData()
          } catch (err) {
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 预览图片（仅完成弹窗使用，编辑弹窗由组件内部处理）
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    const urls = this.data.images
    if (!url || !urls || urls.length === 0) return
    wx.previewImage({
      current: url,
      urls: urls
    })
  }
})
