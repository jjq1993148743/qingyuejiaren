// cloudfunctions/init-data/index.js
// 初始化数据库集合的安全规则
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const results = {}

  // 创建 stories 集合（如果不存在）
  try {
    await db.createCollection('stories')
    results.stories = 'created'
  } catch (e) {
    results.stories = e.message || 'exists'
  }

  // 创建 periods 集合
  try {
    await db.createCollection('periods')
    results.periods = 'created'
  } catch (e) {
    results.periods = e.message || 'exists'
  }

  // 创建 settings 集合
  try {
    await db.createCollection('settings')
    results.settings = 'created'
  } catch (e) {
    results.settings = e.message || 'exists'
  }

  // 初始化例假设置
  try {
    await db.collection('settings').doc('period').set({
      data: {
        cycle: 28,
        duration: 5,
        updatedAt: db.serverDate()
      }
    })
    results.periodSettings = 'initialized'
  } catch (e) {
    results.periodSettings = e.message || 'error'
  }

  return { success: true, results }
}
