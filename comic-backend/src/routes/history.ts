import { Router, Response } from 'express'
import mongoose from 'mongoose'
import { History } from '../models/History'
import { auth, AuthRequest } from '../middleware/auth'

const router = Router()

// 本地漫画元数据
const localComics = [
  { id: 'bocchi-the-rock', title: '孤独摇滚', cover: '/api/comics/local/bocchi-the-rock/cover' },
  { id: 'death-note', title: '死亡笔记', cover: '/api/comics/local/death-note/cover' },
  { id: 'sono-bisque-doll', title: '更衣人偶坠入爱河', cover: '/api/comics/local/sono-bisque-doll/cover' },
  { id: 'akagami-no-shirayuki', title: '赤发白雪姬', cover: '/api/comics/local/akagami-no-shirayuki/cover' }
]

// 获取浏览历史
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId)
    // 获取最近的浏览记录，按时间倒序，去重
    const histories = await History.aggregate([
      { $match: { userId } },
      { $sort: { viewTime: -1 } },
      { $group: {
        _id: '$comicId',
        chapterId: { $first: '$chapterId' },
        viewTime: { $first: '$viewTime' }
      }},
      { $sort: { viewTime: -1 } },
      { $limit: 20 }
    ])

    // 关联漫画信息
    const result = histories.map(h => {
      const comic = localComics.find(c => c.id === h._id)
      return {
        id: h._id,
        title: comic?.title || '未知漫画',
        cover: comic?.cover || '',
        chapter: `第${h.chapterId}话`,
        time: formatTime(h.viewTime)
      }
    })

    res.json({ success: true, histories: result })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取浏览历史失败', error })
  }
})

// 记录浏览历史
router.post('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { comicId, chapterId } = req.body

    if (!comicId) {
      return res.status(400).json({ success: false, message: '缺少漫画ID' })
    }

    const userId = new mongoose.Types.ObjectId(req.userId)
    // 更新或创建记录
    await History.findOneAndUpdate(
      { userId, comicId },
      { chapterId: chapterId || '1', viewTime: new Date() },
      { upsert: true }
    )

    res.json({ success: true, message: '已记录' })
  } catch (error) {
    res.status(500).json({ success: false, message: '记录失败', error })
  }
})

// 格式化时间
function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return new Date(date).toLocaleDateString()
}

export default router
