// pages/little-days/little-days.js
const db = wx.cloud.database()

Page({
  data: {
    currentYear: 2026,
    currentMonth: 4,
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],
    // 选中日期的详情
    selectedDate: null,
    selectedDateStr: '',
    dayStories: [],
    // 例假相关
    periodDays: {}, // {'2026-04-05': true, ...}
    predictedDays: {}, // 预测的
    periodSettings: {
      cycle: 28,
      duration: 5
    },
    showPeriodModal: false,
    showPeriodSettings: false,
    markDate: '',
    // 里程碑日
    milestoneDays: {},
    // 故事标记日
    storyDays: {}
  },

  onLoad() {
    const now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1
    })
    this.loadPeriodSettings()
    this.loadPeriodRecords()
    this.loadStoryDays()
    this.calcMilestoneDays()
    this.generateCalendar()
  },

  onShow() {
    this.loadStoryDays()
    this.generateCalendar()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
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
    // 前面的空位
    for (let i = 0; i < startWeekday; i++) {
      days.push({ day: '', empty: true })
    }
    // 每一天
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const hasStory = !!this.data.storyDays[dateStr]
      const isPeriod = !!this.data.periodDays[dateStr]
      const isPredicted = !!this.data.predictedDays[dateStr]
      const isMilestone = !!this.data.milestoneDays[dateStr]
      const isToday = this.isToday(currentYear, currentMonth, d)

      days.push({
        day: d,
        dateStr,
        hasStory,
        isPeriod,
        isPredicted,
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

  // === 月份切换 ===
  prevMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth--
    if (currentMonth < 1) { currentMonth = 12; currentYear-- }
    this.setData({ currentYear, currentMonth, selectedDate: null })
    this.generateCalendar()
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth++
    if (currentMonth > 12) { currentMonth = 1; currentYear++ }
    this.setData({ currentYear, currentMonth, selectedDate: null })
    this.generateCalendar()
  },

  // === 点击日期 ===
  onDateTap(e) {
    const dateStr = e.currentTarget.dataset.date
    const day = e.currentTarget.dataset.day
    if (!day) return

    this.setData({ selectedDate: dateStr, selectedDateStr: this.formatDateDisplay(dateStr) })
    this.loadDayStories(dateStr)
  },

  formatDateDisplay(dateStr) {
    const parts = dateStr.split('-')
    return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
  },

  async loadDayStories(dateStr) {
    try {
      const start = new Date(dateStr + 'T00:00:00')
      const end = new Date(dateStr + 'T23:59:59')
      const res = await db.collection('stories')
        .where({
          status: 'completed',
          completedAt: db.command.gte(start).and(db.command.lte(end))
        })
        .get()
      this.setData({ dayStories: res.data })
    } catch (err) {
      console.error('加载日期故事失败', err)
    }
  },

  // === 故事标记日 ===
  async loadStoryDays() {
    try {
      const res = await db.collection('stories')
        .where({ status: 'completed' })
        .field({ completedAt: true })
        .get()

      const storyDays = {}
      res.data.forEach(s => {
        if (s.completedAt) {
          const d = new Date(s.completedAt)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          storyDays[key] = true
        }
      })
      this.setData({ storyDays })
      this.generateCalendar()
    } catch (err) {
      console.error('加载故事标记日失败', err)
    }
  },

  // === 里程碑日 ===
  calcMilestoneDays() {
    const start = new Date(2026, 2, 27) // 2026年3月27日
    const now = new Date()
    const currentDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
    const milestones = [1, 7, 30, 60, 100, 200, 365, 520, 730, 1000, 1314]
    const milestoneDays = {}
    milestones.forEach(days => {
      // 只标记已达到的里程碑日
      if (days <= currentDays) {
        const d = new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        milestoneDays[key] = days
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
      // 首次可能不存在，用默认值
    }
  },

  async loadPeriodRecords() {
    try {
      const res = await db.collection('periods').orderBy('startDate', 'desc').limit(10).get()
      const periodDays = {}
      const predictedDays = {}

      const records = res.data
      records.forEach(r => {
        const start = new Date(r.startDate)
        for (let i = 0; i < (r.duration || 5); i++) {
          const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          periodDays[key] = true
        }
      })

      // 预测下次（需要至少1条记录）
      if (records.length >= 1) {
        const lastStart = new Date(records[0].startDate)
        const cycle = this.data.periodSettings.cycle
        const duration = this.data.periodSettings.duration
        // 预测未来3次
        for (let n = 1; n <= 3; n++) {
          const predictedStart = new Date(lastStart.getTime() + n * cycle * 24 * 60 * 60 * 1000)
          for (let i = 0; i < duration; i++) {
            const d = new Date(predictedStart.getTime() + i * 24 * 60 * 60 * 1000)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            if (!periodDays[key]) {
              predictedDays[key] = true
            }
          }
        }
      }

      this.setData({ periodDays, predictedDays })
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
      await db.collection('periods').add({
        data: {
          startDate: this.data.markDate,
          duration: this.data.periodSettings.duration,
          createdAt: db.serverDate()
        }
      })
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
      content: '确定取消这条例假记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 找到包含该日期的记录并删除
            const queryRes = await db.collection('periods')
              .where({
                startDate: dateStr
              })
              .get()

            for (const doc of queryRes.data) {
              await db.collection('periods').doc(doc._id).remove()
            }
            wx.showToast({ title: '已取消', icon: 'none' })
            this.loadPeriodRecords()
          } catch (err) {
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  }
})
