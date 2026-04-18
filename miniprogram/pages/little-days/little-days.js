// pages/little-days/little-days.js
const db = wx.cloud.database()

const MILESTONES = [
  { days: 1, label: '初心', icon: '💕' },
  { days: 7, label: '一周之约', icon: '🌱' },
  { days: 20, label: '二十日情', icon: '🎀' },
  { days: 30, label: '一月相伴', icon: '🌸' },
  { days: 60, label: '两月相知', icon: '🌺' },
  { days: 100, label: '百日情深', icon: '💯' },
  { days: 200, label: '两百夜思念', icon: '🌙' },
  { days: 365, label: '一年长情', icon: '🎊' },
  { days: 520, label: '我爱你', icon: '💗' },
  { days: 730, label: '两周年', icon: '🌹' },
  { days: 1000, label: '千日之恋', icon: '✨' },
  { days: 1314, label: '一生一世', icon: '💍' }
]

Page({
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],
    selectedDate: null,
    selectedDateStr: '',
    dayDetails: [], // 当天详情：愿望/里程碑
    // 例假
    periodDays: {},
    periodSettings: { cycle: 28, duration: 5 },
    showPeriodModal: false,
    showPeriodSettings: false,
    markDate: '',
    // 里程碑日
    milestoneDays: {},
    // 愿望成真日（已完成）
    completedDays: {},
    // 未来愿望日（未完成）
    todoDays: {},
    // 编辑弹窗
    showEditModal: false,
    editingItem: null,
  },

  onLoad() {
    const now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1
    })
    this.loadPeriodSettings()
    this.loadPeriodRecords()
    this.loadAllStoryDays()
    this.calcMilestoneDays()
    this.generateCalendar()
  },

  onShow() {
    // 每次切回都刷新到当月
    const now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1
    })
    if (getApp().globalData.storiesDirty) {
      this.loadAllStoryDays()
    }
    this.generateCalendar()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  // === 日历生成 ===
  generateCalendar() {
    const { currentYear, currentMonth } = this.data
    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    const lastDay = new Date(currentYear, currentMonth, 0)
    const startWeekday = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const days = []
    for (let i = 0; i < startWeekday; i++) {
      days.push({ day: '', empty: true })
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isCompleted = !!this.data.completedDays[dateStr]
      const isTodo = !!this.data.todoDays[dateStr]
      const isPeriod = !!this.data.periodDays[dateStr]
      const isMilestone = !!this.data.milestoneDays[dateStr]
      const isToday = this.isToday(currentYear, currentMonth, d)

      days.push({
        day: d,
        dateStr,
        isCompleted,
        isTodo,
        isPeriod,
        isMilestone,
        isToday
      })
    }
    this.setData({ calendarDays: days })
  },

  isToday(y, m, d) {
    const now = new Date()
    return y === now.getFullYear() && m === now.getMonth() + 1 && d === now.getDate()
  },

  prevMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth--
    if (currentMonth < 1) { currentMonth = 12; currentYear-- }
    this.setData({ currentYear, currentMonth, selectedDate: null, dayDetails: [] })
    this.generateCalendar()
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth++
    if (currentMonth > 12) { currentMonth = 1; currentYear++ }
    this.setData({ currentYear, currentMonth, selectedDate: null, dayDetails: [] })
    this.generateCalendar()
  },

  // === 点击日期 ===
  onDateTap(e) {
    const dateStr = e.currentTarget.dataset.date
    const day = e.currentTarget.dataset.day
    if (!day) return
    this.setData({ selectedDate: dateStr, selectedDateStr: this.formatDateDisplay(dateStr) })
    this.loadDayDetails(dateStr)
  },

  formatDateDisplay(dateStr) {
    const parts = dateStr.split('-')
    return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
  },

  async loadDayDetails(dateStr) {
    try {
      // 按 wishDate 查询
      const [completedRes, todoRes] = await Promise.all([
        db.collection('stories').where({ status: 'completed', wishDate: dateStr }).get(),
        db.collection('stories').where({ status: 'todo', wishDate: dateStr }).get()
      ])

      const dayDetails = []

      // 里程碑
      const milestoneDay = this.data.milestoneDays[dateStr]
      if (milestoneDay) {
        const m = MILESTONES.find(m => m.days === milestoneDay)
        if (m) {
          dayDetails.push({ type: 'milestone', title: `${m.icon} ${m.label} · 在一起${m.days}天`, icon: m.icon })
        }
      }

      // 例假
      if (this.data.periodDays[dateStr]) {
        dayDetails.push({ type: 'period', title: '🩹 例假期', icon: '🩹' })
      }

      // 已完成愿望
      completedRes.data.forEach(s => {
        dayDetails.push({ type: 'completed', ...s })
      })

      // 未完成愿望
      todoRes.data.forEach(s => {
        dayDetails.push({ type: 'todo', ...s })
      })

      this.setData({ dayDetails })
    } catch (err) {
      console.error('加载日期详情失败', err)
    }
  },

  // 点击详情项 → 弹出编辑
  async onDetailItemTap(e) {
    const item = e.currentTarget.dataset.item
    if (item.type === 'milestone' || item.type === 'period') return

    // 获取图片临时链接
    let editImages = item.images || []
    if (editImages.length > 0) {
      try {
        const res = await wx.cloud.getTempFileURL({ fileList: editImages })
        editImages = res.fileList.filter(f => f.status === 0 && f.tempFileURL).map(f => f.tempFileURL)
      } catch (err) {
        console.error('获取图片链接失败', err)
      }
    }

    this.setData({
      showEditModal: true,
      editingItem: { ...item, tempImages: editImages }
    })
  },

  // === 愿望标记日 ===
  async loadAllStoryDays() {
    try {
      const [completedRes, todoRes] = await Promise.all([
        db.collection('stories').where({ status: 'completed' }).field({ completedAt: true, wishDate: true }).get(),
        db.collection('stories').where({ status: 'todo' }).field({ wishDate: true }).get()
      ])

      const completedDays = {}
      completedRes.data.forEach(s => {
        // 用 wishDate 标记在日历上
        if (s.wishDate) {
          completedDays[s.wishDate] = true
        } else if (s.completedAt) {
          // 安全解析 completedAt
          let key = ''
          if (typeof s.completedAt === 'string' && s.completedAt.length >= 10) {
            key = s.completedAt.slice(0, 10)
          } else {
            const d = new Date(s.completedAt)
            if (!isNaN(d.getTime())) {
              key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            }
          }
          if (key) completedDays[key] = true
        }
      })

      const todoDays = {}
      todoRes.data.forEach(s => {
        if (s.wishDate) {
          todoDays[s.wishDate] = true
        }
      })

      this.setData({ completedDays, todoDays })
      this.generateCalendar()
    } catch (err) {
      console.error('加载愿望标记日失败', err)
    }
  },

  // === 里程碑日 ===
  calcMilestoneDays() {
    const start = getApp().globalData.startDate || new Date(2026, 2, 27)
    const now = new Date()
    const currentDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
    const milestoneDays = {}
    MILESTONES.forEach(m => {
      if (m.days <= currentDays) {
        const d = new Date(start.getTime() + m.days * 24 * 60 * 60 * 1000)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        milestoneDays[key] = m.days
      }
    })
    this.setData({ milestoneDays })
  },

  // === 例假功能 ===
  async loadPeriodSettings() {
    try {
      const res = await db.collection('settings').doc('period').get()
      if (res.data) {
        this.setData({
          periodSettings: {
            cycle: res.data.cycle || 28,
            duration: res.data.duration || 5
          }
        })
      }
    } catch (err) {
      // 首次可能不存在
    }
  },

  async loadPeriodRecords() {
    try {
      // 支持两种格式：新格式（逐日记录 date 字段）和旧格式（startDate + duration）
      const [dayRes, rangeRes] = await Promise.all([
        db.collection('periods').where({ date: db.command.exists(true) }).limit(100).get(),
        db.collection('periods').where({ startDate: db.command.exists(true), date: db.command.exists(false) }).limit(50).get()
      ])

      const periodDays = {}
      // 新格式：逐日
      dayRes.data.forEach(r => {
        if (r.date) {
          const d = new Date(r.date)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          periodDays[key] = r._id  // 存记录ID方便删除
        }
      })
      // 旧格式兼容
      rangeRes.data.forEach(r => {
        const start = new Date(r.startDate)
        for (let i = 0; i < (r.duration || 5); i++) {
          const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          periodDays[key] = r._id
        }
      })
      this.setData({ periodDays })
      this.generateCalendar()
    } catch (err) {
      console.error('加载例假记录失败', err)
    }
  },

  onMarkPeriod() {
    if (!this.data.selectedDate) {
      wx.showToast({ title: '请先选择日期', icon: 'none' })
      return
    }
    this.setData({ showPeriodModal: true, markDate: this.data.selectedDate })
  },

  onPeriodModalClose() {
    this.setData({ showPeriodModal: false })
  },

  async onConfirmMark() {
    try {
      // 逐日存储，每天一条记录
      const startDate = new Date(this.data.markDate + 'T00:00:00')
      const duration = this.data.periodSettings.duration
      const addPromises = []
      for (let i = 0; i < duration; i++) {
        const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        addPromises.push(
          db.collection('periods').add({
            data: {
              date: dateStr,
              createdAt: db.serverDate()
            }
          })
        )
      }
      await Promise.all(addPromises)
      wx.showToast({ title: '已标记', icon: 'none' })
      this.setData({ showPeriodModal: false })
      this.loadPeriodRecords()
    } catch (err) {
      wx.showToast({ title: '标记失败', icon: 'none' })
    }
  },

  onPeriodSettings() {
    this.setData({ showPeriodSettings: true })
  },

  onSettingsClose() {
    this.setData({ showPeriodSettings: false })
  },

  onCycleChange(e) {
    this.setData({ 'periodSettings.cycle': Number(e.detail.value) + 21 })
  },

  onDurationChange(e) {
    this.setData({ 'periodSettings.duration': Number(e.detail.value) + 3 })
  },

  async onSaveSettings() {
    try {
      const { cycle, duration } = this.data.periodSettings
      await db.collection('settings').doc('period').set({
        data: { cycle, duration, updatedAt: db.serverDate() }
      })
      wx.showToast({ title: '设置已保存', icon: 'none' })
      this.setData({ showPeriodSettings: false })
      this.loadPeriodRecords()
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onCancelPeriod() {
    if (!this.data.selectedDate) return
    const dateStr = this.data.selectedDate
    wx.showModal({
      title: '',
      content: '确定取消这一天（' + this.formatDateDisplay(dateStr) + '）的例假标记吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 新格式：按 date 字段查找删除
            const dayRes = await db.collection('periods')
              .where({ date: dateStr })
              .get()
            for (const doc of dayRes.data) {
              await db.collection('periods').doc(doc._id).remove()
            }
            // 旧格式兼容：按 startDate 查找（如果包含这一天）
            const rangeRes = await db.collection('periods')
              .where({ startDate: db.command.exists(true), date: db.command.exists(false) })
              .limit(50)
              .get()
            for (const doc of rangeRes.data) {
              const start = new Date(doc.startDate)
              const duration = doc.duration || 5
              for (let i = 0; i < duration; i++) {
                const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                if (key === dateStr) {
                  await db.collection('periods').doc(doc._id).remove()
                  break
                }
              }
            }
            wx.showToast({ title: '已取消', icon: 'none' })
            this.loadPeriodRecords()
            if (this.data.selectedDate) this.loadDayDetails(this.data.selectedDate)
          } catch (err) {
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  // === 编辑弹窗 ===
  onEditClose() {
    this.setData({ showEditModal: false, editingItem: null })
  },

  async onEditSubmit(e) {
    const data = e.detail
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
      getApp().globalData.storiesDirty = true
      this.loadAllStoryDays()
      if (this.data.selectedDate) this.loadDayDetails(this.data.selectedDate)
    } catch (err) {
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  }
})
