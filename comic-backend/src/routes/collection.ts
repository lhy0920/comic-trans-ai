import { Router, Response } from 'express'
import { Collection } from '../models/Collection'
import { auth, AuthRequest } from '../middleware/auth'

const router = Router()

// 本地漫画元数据（复用 comic.ts 中的数据）
const localComics = [
  {
    id: 'bocchi-the-rock',
    title: '孤独摇滚',
    author: 'はまじあき',
    cover: '/api/comics/local/bocchi-the-rock/cover',
    tags: ['音乐', '日常', '搞笑'],
    rating: 9.2,
    status: '连载中',
    chapters: 50
  },
  {
    id: 'death-note',
    title: '死亡笔记',
    author: '大场�的/小畑健',
    cover: '/api/comics/local/death-note/cover',
    tags: ['悬疑', '心理', '犯罪'],
    rating: 9.5,
    status: '已完结',
    chapters: 12
  },
  {
    id: 'sono-bisque-doll',
    title: '更衣人偶坠入爱河',
    author: '福田晋一',
    cover: '/api/comics/local/sono-bisque-doll/cover',
    tags: ['恋爱', 'Cosplay', '校园'],
    rating: 9.0,
    status: '连载中',
    chapters: 13
  },
  {
    id: 'akagami-no-shirayuki',
    title: '赤发白雪姬',
    author: '秋月空太',
    cover: '/api/comics/local/akagami-no-shirayuki/cover',
    tags: ['奇幻', '恋爱', '宫廷'],
    rating: 8.8,
    status: '连载中',
    chapters: 25
  }
]

// 获取用户收藏列表
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const collections = await Collection.find({ userId: req.userId })
      .sort({ collectTime: -1 })

    // 关联漫画详情
    const result = collections.map(c => {
      const comic = localComics.find(lc => lc.id === c.comicId)
      return {
        id: c.comicId,
        title: comic?.title || '未知漫画',
        cover: comic?.cover || '',
        chapters: comic?.chapters || 0,
        lastRead: c.lastReadChapter,
        collectTime: c.collectTime.toISOString()
      }
    })

    res.json({ success: true, collections: result })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取收藏失败', error })
  }
})

// 检查是否已收藏
router.get('/check/:comicId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const collection = await Collection.findOne({
      userId: req.userId,
      comicId: req.params.comicId
    })
    res.json({ success: true, isCollected: !!collection })
  } catch (error) {
    res.status(500).json({ success: false, message: '检查收藏状态失败', error })
  }
})

// 添加收藏
router.post('/:comicId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { comicId } = req.params

    // 检查漫画是否存在
    const comic = localComics.find(c => c.id === comicId)
    if (!comic) {
      return res.status(404).json({ success: false, message: '漫画不存在' })
    }

    // 检查是否已收藏
    const existing = await Collection.findOne({ userId: req.userId, comicId })
    if (existing) {
      return res.status(400).json({ success: false, message: '已经收藏过了' })
    }

    const collection = new Collection({
      userId: req.userId,
      comicId,
      lastReadChapter: 0
    })
    await collection.save()

    res.json({ success: true, message: '收藏成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: '收藏失败', error })
  }
})

// 取消收藏
router.delete('/:comicId', auth, async (req: AuthRequest, res: Response) => {
  try {
    await Collection.findOneAndDelete({
      userId: req.userId,
      comicId: req.params.comicId
    })
    res.json({ success: true, message: '已取消收藏' })
  } catch (error) {
    res.status(500).json({ success: false, message: '取消收藏失败', error })
  }
})

// 更新阅读进度
router.put('/:comicId/progress', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { chapter } = req.body
    await Collection.findOneAndUpdate(
      { userId: req.userId, comicId: req.params.comicId },
      { lastReadChapter: chapter },
      { upsert: true }
    )
    res.json({ success: true, message: '进度已更新' })
  } catch (error) {
    res.status(500).json({ success: false, message: '更新进度失败', error })
  }
})

export default router
