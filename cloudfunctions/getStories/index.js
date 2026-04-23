const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, status, wishDate, limit, page, field } = event

  try {
    let query = {}
    if (status) query.status = status
    if (wishDate) query.wishDate = wishDate

    const pageSize = limit || 20
    const pageNum = page || 0

    let queryRef = db.collection('stories').where(query)
    
    if (action === 'queryStoriesDesc') {
      queryRef = queryRef.orderBy('completedAt', 'desc')
    } else {
      queryRef = queryRef.orderBy('wishDate', 'asc')
    }

    queryRef = queryRef.skip(pageNum * pageSize).limit(pageSize)

    if (field) {
      queryRef = queryRef.field(field)
    }

    const res = await queryRef.get()
    const countRes = await db.collection('stories').where(query).count()

    // 服务端获取图片临时链接
    const allFileIds = []
    res.data.forEach(s => {
      if (s.images && s.images.length > 0) {
        allFileIds.push(...s.images)
      }
    })

    console.log('allFileIds:', JSON.stringify(allFileIds))

    const urlMap = {}
    if (allFileIds.length > 0) {
      try {
        const urlRes = await cloud.getTempFileURL({ fileList: allFileIds })
        console.log('getTempFileURL result:', JSON.stringify(urlRes.fileList.map(f => ({ fileID: f.fileID, status: f.status, tempFileURL: f.tempFileURL }))))
        urlRes.fileList.forEach(f => {
          if (f.status === 0 && f.tempFileURL) {
            urlMap[f.fileID] = f.tempFileURL
          }
        })
      } catch (urlErr) {
        console.error('getTempFileURL failed:', urlErr)
      }
    }

    console.log('urlMap keys:', Object.keys(urlMap).length)

    res.data.forEach(s => {
      if (s.images && s.images.length > 0) {
        s.tempImages = s.images.map(id => urlMap[id] || '').filter(Boolean)
      }
    })

    return { code: 0, data: res.data, total: countRes.total }
  } catch (err) {
    console.error('getStories error:', err)
    return { code: -1, msg: err.message || '查询失败' }
  }
}
