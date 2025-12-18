import { Router, Request, Response } from 'express'
import { Comic } from '../models/Comic'
import { auth, AuthRequest } from '../middleware/auth'
import { upload } from '../middleware/upload'
import fs from 'fs'
import path from 'path'

const router = Router()

// 漫画数据目录
const COMICS_DIR = path.join(__dirname, '../data/漫画集')

// 本地漫画元数据
const localComics = [
  {
    id: 'bocchi-the-rock',
    title: '孤独摇滚',
    author: 'はまじあき',
    description: '后藤一里是一个喜欢吉他的孤独少女。在网上作为"吉他英雄"而广受好评的她，在现实中却是个什么都不会的沟通障碍者。',
    cover: '/api/comics/local/bocchi-the-rock/cover',
    tags: ['音乐', '日常', '搞笑'],
    rating: 9.2,
    status: '连载中',
    folder: '孤獨搖滾',
    format: 'pdf'
  },
  {
    id: 'death-note',
    title: '死亡笔记',
    author: '大场�的/小畑健',
    description: '高中生夜神月捡到了死神琉克丢下的死亡笔记，从此开始了他的"新世界"计划。',
    cover: '/api/comics/local/death-note/cover',
    tags: ['悬疑', '心理', '犯罪'],
    rating: 9.5,
    status: '已完结',
    folder: '【高清港版】死亡笔记',
    format: 'pdf'
  },
  {
    id: 'sono-bisque-doll',
    title: '更衣人偶坠入爱河',
    author: '福田晋一',
    description: '五条新菜是一个喜欢制作雏人偶的高中生，某天被辣妹喜多川海梦发现了他的秘密...',
    cover: '/api/comics/local/sono-bisque-doll/cover',
    tags: ['恋爱', 'Cosplay', '校园'],
    rating: 9.0,
    status: '连载中',
    folder: '【漫画】更衣人偶坠入爱河 PDF格式',
    format: 'pdf'
  },
  {
    id: 'akagami-no-shirayuki',
    title: '赤发白雪姬',
    author: '秋月空太',
    description: '白雪是一位有着如苹果般红发的少女，因为这头美丽的红发而被王子看中，为了逃离王子的追求，她逃到了邻国...',
    cover: '/api/comics/local/akagami-no-shirayuki/cover',
    tags: ['奇幻', '恋爱', '宫廷'],
    rating: 8.8,
    status: '连载中',
    folder: '赤发白雪姬',
    format: 'mobi'
  }
]

// 获取本地漫画章节
function getLocalChapters(comic: typeof localComics[0]) {
  const comicPath = path.join(COMICS_DIR, comic.folder)
  if (!fs.existsSync(comicPath)) return []
  
  const chapters: Array<{id: string, title: string, filePath: string}> = []
  
  if (comic.id === 'bocchi-the-rock') {
    const files = fs.readdirSync(comicPath)
      .filter(f => f.endsWith('.pdf'))
      .sort((a, b) => {
        const numA = parseFloat(a.split(' ')[0]) || 0
        const numB = parseFloat(b.split(' ')[0]) || 0
        return numA - numB
      })
    files.forEach(file => {
      const match = file.match(/^([\d.]+)\s*(.+)\.pdf$/)
      if (match) {
        chapters.push({ id: match[1], title: match[2], filePath: `${comic.folder}/${file}` })
      }
    })
  } else if (comic.id === 'death-note') {
    const files = fs.readdirSync(comicPath)
      .filter(f => f.endsWith('.pdf'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0')
        const numB = parseInt(b.match(/\d+/)?.[0] || '0')
        return numA - numB
      })
    files.forEach((file, index) => {
      chapters.push({ id: String(index + 1), title: `第${index + 1}卷`, filePath: `${comic.folder}/${file}` })
    })
  } else if (comic.id === 'sono-bisque-doll') {
    const volPath = path.join(comicPath, '1-13卷（等于1-102话）')
    if (fs.existsSync(volPath)) {
      const files = fs.readdirSync(volPath)
        .filter(f => f.endsWith('.pdf'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/Vol\.(\d+)/)?.[1] || '0')
          const numB = parseInt(b.match(/Vol\.(\d+)/)?.[1] || '0')
          return numA - numB
        })
      files.forEach(file => {
        const match = file.match(/Vol\.(\d+)/)
        if (match) {
          chapters.push({ id: match[1], title: `第${match[1]}卷`, filePath: `${comic.folder}/1-13卷（等于1-102话）/${file}` })
        }
      })
    }
  } else if (comic.id === 'akagami-no-shirayuki') {
    const mobiPath = path.join(comicPath, '单行本')
    if (fs.existsSync(mobiPath)) {
      const files = fs.readdirSync(mobiPath)
        .filter(f => f.endsWith('.mobi'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/(\d+)/)?.[1] || '0')
          const numB = parseInt(b.match(/(\d+)/)?.[1] || '0')
          return numA - numB
        })
      files.forEach(file => {
        const match = file.match(/(\d+)卷/)
        if (match) {
          chapters.push({ id: match[1], title: `第${match[1]}卷`, filePath: `${comic.folder}/单行本/${file}` })
        }
      })
    }
  }
  return chapters
}

// 获取本地漫画列表
router.get('/local/list', (req: Request, res: Response) => {
  const comics = localComics.map(c => ({
    id: c.id,
    title: c.title,
    author: c.author,
    description: c.description,
    cover: c.cover,
    tags: c.tags,
    rating: c.rating,
    status: c.status
  }))
  res.json({ success: true, comics })
})

// 获取本地漫画详情
router.get('/local/:id', (req: Request, res: Response) => {
  const comic = localComics.find(c => c.id === req.params.id)
  if (!comic) return res.status(404).json({ success: false, error: '漫画不存在' })
  
  const chapters = getLocalChapters(comic)
  res.json({ success: true, comic: { ...comic, chapters } })
})

// 获取本地漫画封面（返回第一章 PDF 的 URL，前端会提取第一页）
router.get('/local/:id/cover', (req: Request, res: Response) => {
  const comic = localComics.find(c => c.id === req.params.id)
  if (!comic) {
    return res.redirect('https://picsum.photos/seed/comic/400/600')
  }
  
  const chapters = getLocalChapters(comic)
  if (chapters.length > 0) {
    // 返回第一章的 PDF URL，前端会用 pdfjs 提取第一页作为封面
    res.json({ 
      success: true, 
      type: 'pdf',
      url: `/api/comics/local/${req.params.id}/chapter/${chapters[0].id}`
    })
  } else {
    // 没有章节，返回占位图
    res.redirect('https://picsum.photos/seed/comic/400/600')
  }
})

// 获取本地漫画章节PDF
router.get('/local/:id/chapter/:chapterId', (req: Request, res: Response) => {
  const comic = localComics.find(c => c.id === req.params.id)
  if (!comic) return res.status(404).json({ success: false, error: '漫画不存在' })
  
  const chapters = getLocalChapters(comic)
  const chapter = chapters.find(c => c.id === req.params.chapterId)
  if (!chapter) return res.status(404).json({ success: false, error: '章节不存在' })
  
  const filePath = path.join(COMICS_DIR, chapter.filePath)
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf')
    res.sendFile(filePath)
  } else {
    res.status(404).json({ success: false, error: '文件不存在' })
  }
})

// ========== 原有的 MongoDB 路由 ==========

// 获取漫画列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, tag } = req.query
    const query = tag ? { tags: tag } : {}
    
    const comics = await Comic.find(query)
      .select('-chapters.pages')
      .sort({ updatedAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
    
    const total = await Comic.countDocuments(query)
    res.json({ comics, total, page: +page, totalPages: Math.ceil(total / +limit) })
  } catch (error) {
    res.status(500).json({ message: '获取漫画列表失败', error })
  }
})

// 获取漫画详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const comic = await Comic.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).select('-chapters.pages')
    
    if (!comic) return res.status(404).json({ message: '漫画不存在' })
    res.json(comic)
  } catch (error) {
    res.status(500).json({ message: '获取漫画详情失败', error })
  }
})

// 获取章节内容
router.get('/:id/chapter/:chapterId', async (req: Request, res: Response) => {
  try {
    const comic = await Comic.findById(req.params.id)
    if (!comic) return res.status(404).json({ message: '漫画不存在' })
    
    const chapter = comic.chapters.find(c => c._id.toString() === req.params.chapterId)
    if (!chapter) return res.status(404).json({ message: '章节不存在' })
    
    res.json(chapter)
  } catch (error) {
    res.status(500).json({ message: '获取章节失败', error })
  }
})

// 上传漫画（需登录）
router.post('/', auth, upload.single('cover'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, author, description, tags } = req.body
    const cover = req.file ? `/uploads/${req.file.filename}` : ''
    
    const comic = new Comic({
      title,
      author,
      description,
      tags: tags ? tags.split(',') : [],
      cover
    })
    await comic.save()
    res.status(201).json(comic)
  } catch (error) {
    res.status(500).json({ message: '创建漫画失败', error })
  }
})

// 上传章节（支持多图）
router.post('/:id/chapter', auth, upload.array('pages', 100), async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body
    const files = req.files as Express.Multer.File[]
    const pages = files.map(f => `/uploads/${f.filename}`)
    
    const comic = await Comic.findByIdAndUpdate(
      req.params.id,
      { 
        $push: { chapters: { title, pages } },
        updatedAt: new Date()
      },
      { new: true }
    )
    
    if (!comic) return res.status(404).json({ message: '漫画不存在' })
    res.status(201).json(comic.chapters[comic.chapters.length - 1])
  } catch (error) {
    res.status(500).json({ message: '上传章节失败', error })
  }
})

export default router
