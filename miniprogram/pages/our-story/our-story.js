// pages/our-story/our-story.js
const db = wx.cloud.database()

Page({
  data: {
    todos: [],
    completed: [],
    loading: true,
    showEditModal: false,
    editingItem: null,
    isAddMode: false
  },

  onLoad() {
    // loadData 由 onShow 统一调用
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
        wx.cloud.callFunction({ name: 'getStories', data: { action: 'queryStories', status: 'todo', limit: 100 } }),
        wx.cloud.callFunction({ name: 'getStories', data: { action: 'queryStoriesDesc', status: 'completed', limit: 100 } })
      ])

      this.setData({
        todos: todoRes.result.data || [],
        completed: (doneRes.result.data || []).map(s => {
          // 清理无效 feeling 值
          let f = s.feeling
          if (f === null || f === undefined || typeof f !== 'string' ||
              f.trim() === '' || f.trim() === 'undefined') {
            f = ''
          }
          return {
            ...s,
            dateStr: this.formatDate(s.completedAt),
            imageCount: s.images ? s.images.length : 0,
            feeling: f.trim()
          }
        }),
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

  // === 新增/完成（统一用编辑弹窗） ===
  preventBubble() {},

  onAddTap() {
    this.setData({ showEditModal: true, editingItem: null, isAddMode: true })
  },

  async onAddSubmit(e) {
    const data = e.detail
    try {
      const hasCompletedData = data.completedAt || data.feeling || (data.images && data.images.length > 0)
      await db.collection('stories').add({
        data: {
          title: data.title,
          description: '',
          wishDate: data.wishDate,
          status: hasCompletedData ? 'completed' : 'todo',
          feeling: data.feeling || '',
          images: data.images || [],
          createdAt: db.serverDate(),
          completedAt: data.completedAt || null
        }
      })
      wx.showToast({ title: '已记录', icon: 'none' })
      this.setData({ showEditModal: false, isAddMode: false })
      this.loadData()
    } catch (err) {
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  // 点击未完成的对号 → 打开编辑弹窗（可直接完成）
  onCompleteTap(e) {
    this.openEditModal(e)
  },

  // === 打开编辑/预览弹窗 ===
  async openEditModal(e) {
    const item = e.currentTarget.dataset.item
    let tempImages = item.tempImages || []
    // 如果还没有临时链接，用云函数获取
    if (tempImages.length === 0 && item.images && item.images.length > 0) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'getStories',
          data: { action: 'queryStories', status: item.status, wishDate: item.wishDate, limit: 100 }
        })
        const found = (res.result.data || []).find(s => s._id === item._id)
        if (found && found.tempImages) {
          tempImages = found.tempImages
        }
      } catch (err) {
        console.error('获取图片链接失败', err)
      }
    }

    // 客户端转换 cloud:// 为 https 临时链接（分批）
    const cloudIds = tempImages.filter(u => u && u.startsWith('cloud://'))
    if (cloudIds.length > 0) {
      const BATCH = 49
      const urlMap = {}
      for (let i = 0; i < cloudIds.length; i += BATCH) {
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: cloudIds.slice(i, i + BATCH) })
          urlRes.fileList.forEach(f => {
            if (f.tempFileURL) urlMap[f.fileID] = f.tempFileURL
          })
        } catch (e) {
          console.error('getTempFileURL batch failed', e)
        }
      }
      tempImages = tempImages.map(u => (u && u.startsWith('cloud://') ? (urlMap[u] || '') : u)).filter(Boolean)
    }

    this.setData({
      showEditModal: true,
      editingItem: { ...item, tempImages }
    })
  },

  onEditClose() {
    this.setData({ showEditModal: false, editingItem: null, isAddMode: false })
  },

  async onEditSubmit(e) {
    const data = e.detail
    const updateData = {
      title: data.title,
      wishDate: data.wishDate
    }

    // 有完成数据 → 状态改为 completed
    if (data.completedAt || (data.feeling && data.feeling.trim())) {
      updateData.status = 'completed'
    }
    if (data.completedAt) {
      updateData.completedAt = data.completedAt
    }
    if (data.feeling !== undefined && data.feeling !== '') {
      updateData.feeling = data.feeling
    }
    if (data.images !== undefined) {
      updateData.images = data.images
    }

    try {
      if (data.removedImages && data.removedImages.length > 0) {
        await Promise.all(data.removedImages.map(fileId =>
          wx.cloud.deleteFile({ fileList: [fileId] }).catch(() => {})
        ))
      }

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
      content: '要重新放回愿望清单吗？记录和图片将被清空。',
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

})
