import express from 'express'
import crypto from 'crypto'
import { ShortLink } from '../models/ShortLink'
import { auth, AuthRequest } from '../middleware/auth'

const router = express.Router()

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000'

// 生成短链接哈希
const generateHash = (): string => {
  return crypto.randomBytes(4).toString('base64url').slice(0, 6)
}

// 验证URL格式
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// 创建短链接
router.post('/create', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId!
    const { url } = req.body

    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ success: false, message: '请提供有效的URL' })
    }

    // 检查是否已存在相同URL的短链接
    const existing = await ShortLink.findOne({ originalUrl: url, creator: userId })
    if (existing) {
      return res.json({
        success: true,
        shortUrl: `${BASE_URL}/s/${existing.hash}`,
        hash: existing.hash,
        originalUrl: url
      })
    }

    // 生成唯一哈希
    let hash = generateHash()
    let attempts = 0
    while (await ShortLink.findOne({ hash }) && attempts < 10) {
      hash = generateHash()
      attempts++
    }

    const shortLink = new ShortLink({
      hash,
      originalUrl: url,
      creator: userId
    })

    await shortLink.save()

    res.json({
      success: true,
      shortUrl: `${BASE_URL}/s/${hash}`,
      hash,
      originalUrl: url
    })
  } catch (error) {
    console.error('创建短链接失败:', error)
    res.status(500).json({ success: false, message: '创建短链接失败' })
  }
})

// 批量创建短链接
router.post('/batch', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId!
    const { urls } = req.body

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ success: false, message: '请提供URL数组' })
    }

    const results: { original: string; short: string; hash: string }[] = []

    for (const url of urls) {
      if (!isValidUrl(url)) continue

      // 检查是否已存在
      let shortLink = await ShortLink.findOne({ originalUrl: url, creator: userId })
      
      if (!shortLink) {
        let hash = generateHash()
        let attempts = 0
        while (await ShortLink.findOne({ hash }) && attempts < 10) {
          hash = generateHash()
          attempts++
        }

        shortLink = new ShortLink({
          hash,
          originalUrl: url,
          creator: userId
        })
        await shortLink.save()
      }

      results.push({
        original: url,
        short: `${BASE_URL}/s/${shortLink.hash}`,
        hash: shortLink.hash
      })
    }

    res.json({ success: true, links: results })
  } catch (error) {
    console.error('批量创建短链接失败:', error)
    res.status(500).json({ success: false, message: '创建失败' })
  }
})

// 获取我的短链接列表
router.get('/my', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const links = await ShortLink.find({ creator: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean()

    const formattedLinks = links.map(link => ({
      id: link._id,
      hash: link.hash,
      shortUrl: `${BASE_URL}/s/${link.hash}`,
      originalUrl: link.originalUrl,
      clicks: link.clicks,
      createdAt: link.createdAt
    }))

    const total = await ShortLink.countDocuments({ creator: userId })

    res.json({
      success: true,
      links: formattedLinks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('获取短链接列表失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 删除短链接
router.delete('/:hash', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const { hash } = req.params

    const link = await ShortLink.findOne({ hash })
    if (!link) {
      return res.status(404).json({ success: false, message: '短链接不存在' })
    }

    if (link.creator.toString() !== userId) {
      return res.status(403).json({ success: false, message: '无权删除此短链接' })
    }

    await ShortLink.findByIdAndDelete(link._id)
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除短链接失败:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

// 短链接重定向（公开访问）
router.get('/:hash', async (req, res) => {
  try {
    const { hash } = req.params

    const link = await ShortLink.findOne({ hash })
    if (!link) {
      return res.status(404).json({ success: false, message: '短链接不存在或已过期' })
    }

    // 增加点击次数
    link.clicks += 1
    await link.save()

    // 重定向到原始URL
    res.redirect(link.originalUrl)
  } catch (error) {
    console.error('短链接重定向失败:', error)
    res.status(500).json({ success: false, message: '重定向失败' })
  }
})

export default router
