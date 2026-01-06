import express from 'express'
import { Types } from 'mongoose'
import { Post } from '../models/Post'
import { User } from '../models/User'
import { auth, AuthRequest } from '../middleware/auth'
import multer from 'multer'
import path from 'path'

const router = express.Router()

// 图片上传配置
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'))
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (extname && mimetype) {
      cb(null, true)
    } else {
      cb(new Error('只支持图片文件'))
    }
  }
})

// 格式化时间
const formatTime = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

// 格式化头像 URL
const formatAvatar = (avatar: string | undefined): string => {
  if (!avatar) return ''
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000'
  // 如果已经是完整 URL，直接返回
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar
  }
  // 否则拼接 baseUrl
  return `${baseUrl}${avatar}`
}

// 获取帖子列表
router.get('/', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const { page = 1, limit = 10 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('author', 'username nickname avatar')
      .populate('comments.author', 'username nickname avatar')
      .lean()

    const formattedPosts = posts.map(post => ({
      id: post._id,
      author: {
        id: (post.author as any)._id,
        username: (post.author as any).username,
        nickname: (post.author as any).nickname,
        avatar: formatAvatar((post.author as any).avatar)
      },
      content: post.content,
      images: post.images.map(img => `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${img}`),
      tags: post.tags,
      likes: post.likes.length,
      isLiked: post.likes.some(id => id.toString() === userId),
      stars: post.stars.length,
      isStarred: post.stars.some(id => id.toString() === userId),
      shares: post.shares,
      commentsCount: post.comments.length,
      comments: post.comments.slice(0, 3).map(comment => ({
        id: comment._id,
        author: {
          id: (comment.author as any)._id,
          username: (comment.author as any).username,
          nickname: (comment.author as any).nickname,
          avatar: formatAvatar((comment.author as any).avatar)
        },
        content: comment.content,
        replyTo: comment.replyToUsername,
        likes: comment.likes.length,
        isLiked: comment.likes.some(id => id.toString() === userId),
        time: formatTime(comment.createdAt)
      })),
      createdAt: post.createdAt,
      time: formatTime(post.createdAt)
    }))

    const total = await Post.countDocuments({})

    res.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('获取帖子列表失败:', error)
    res.status(500).json({ success: false, message: '获取帖子列表失败' })
  }
})

// 获取单个帖子详情
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const post = await Post.findById(req.params.id)
      .populate('author', 'username nickname avatar')
      .populate('comments.author', 'username nickname avatar')
      .lean()

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' })
    }

    const formattedPost = {
      id: post._id,
      author: {
        id: (post.author as any)._id,
        username: (post.author as any).username,
        nickname: (post.author as any).nickname,
        avatar: formatAvatar((post.author as any).avatar)
      },
      content: post.content,
      images: post.images.map(img => `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${img}`),
      tags: post.tags,
      likes: post.likes.length,
      isLiked: post.likes.some(id => id.toString() === userId),
      stars: post.stars.length,
      isStarred: post.stars.some(id => id.toString() === userId),
      shares: post.shares,
      comments: post.comments.map(comment => ({
        id: comment._id,
        author: {
          id: (comment.author as any)._id,
          username: (comment.author as any).username,
          nickname: (comment.author as any).nickname,
          avatar: formatAvatar((comment.author as any).avatar)
        },
        content: comment.content,
        replyTo: comment.replyToUsername,
        likes: comment.likes.length,
        isLiked: comment.likes.some(id => id.toString() === userId),
        time: formatTime(comment.createdAt)
      })),
      createdAt: post.createdAt,
      time: formatTime(post.createdAt)
    }

    res.json({ success: true, post: formattedPost })
  } catch (error) {
    console.error('获取帖子详情失败:', error)
    res.status(500).json({ success: false, message: '获取帖子详情失败' })
  }
})

// 发布帖子
router.post('/', auth, upload.array('images', 9), async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const { content, tags, visibility } = req.body
    const files = req.files as Express.Multer.File[]

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: '内容不能为空' })
    }

    const images = files ? files.map(f => f.filename) : []
    const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : []
    const postVisibility = visibility || 'public'

    const post = new Post({
      author: userId,
      content: content.trim(),
      images,
      tags: parsedTags,
      visibility: postVisibility
    })

    await post.save()

    res.json({ success: true, message: '发布成功', postId: post._id })
  } catch (error) {
    console.error('发布帖子失败:', error)
    res.status(500).json({ success: false, message: '发布失败' })
  }
})

// 删除帖子
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' })
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({ success: false, message: '无权删除此帖子' })
    }

    await Post.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除帖子失败:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

// 点赞/取消点赞帖子
router.post('/:id/like', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId!
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' })
    }

    const userObjectId = new Types.ObjectId(userId)
    const isLiked = post.likes.some(id => id.toString() === userId)

    if (isLiked) {
      post.likes = post.likes.filter(id => id.toString() !== userId)
    } else {
      post.likes.push(userObjectId)
    }

    await post.save()

    res.json({
      success: true,
      isLiked: !isLiked,
      likes: post.likes.length
    })
  } catch (error) {
    console.error('点赞失败:', error)
    res.status(500).json({ success: false, message: '操作失败' })
  }
})

// 收藏/取消收藏帖子
router.post('/:id/star', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId!
    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' })
    }

    const userObjectId = new Types.ObjectId(userId)
    const isStarred = post.stars.some(id => id.toString() === userId)

    if (isStarred) {
      post.stars = post.stars.filter(id => id.toString() !== userId)
    } else {
      post.stars.push(userObjectId)
    }

    await post.save()

    res.json({
      success: true,
      isStarred: !isStarred,
      stars: post.stars.length
    })
  } catch (error) {
    console.error('收藏失败:', error)
    res.status(500).json({ success: false, message: '操作失败' })
  }
})

// 分享帖子
router.post('/:id/share', auth, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { shares: 1 } },
      { new: true }
    )

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' })
    }

    res.json({ success: true, shares: post.shares })
  } catch (error) {
    console.error('分享失败:', error)
    res.status(500).json({ success: false, message: '操作失败' })
  }
})

// 获取帖子评论列表
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const post = await Post.findById(req.params.id)
      .populate('comments.author', 'username nickname avatar')
      .lean()

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' })
    }

    const comments = post.comments.map(comment => ({
      id: comment._id,
      author: {
        id: (comment.author as any)._id,
        username: (comment.author as any).username,
        nickname: (comment.author as any).nickname,
        avatar: formatAvatar((comment.author as any).avatar)
      },
      content: comment.content,
      replyTo: comment.replyToUsername,
      likes: comment.likes.length,
      isLiked: comment.likes.some(id => id.toString() === userId),
      time: formatTime(comment.createdAt)
    }))

    res.json({ success: true, comments })
  } catch (error) {
    console.error('获取评论失败:', error)
    res.status(500).json({ success: false, message: '获取评论失败' })
  }
})

// 发表评论
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId!
    const { content, replyTo } = req.body

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: '评论内容不能为空' })
    }

    const post = await Post.findById(req.params.id)
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' })
    }

    let replyToUsername
    if (replyTo) {
      const replyUser = await User.findById(replyTo)
      replyToUsername = replyUser?.nickname || replyUser?.username
    }

    const comment = {
      _id: new Types.ObjectId(),
      author: new Types.ObjectId(userId),
      content: content.trim(),
      replyTo: replyTo ? new Types.ObjectId(replyTo) : undefined,
      replyToUsername,
      likes: [] as Types.ObjectId[],
      createdAt: new Date()
    }

    post.comments.push(comment)
    await post.save()

    const user = await User.findById(userId)

    res.json({
      success: true,
      comment: {
        id: comment._id,
        author: {
          id: userId,
          username: user?.username,
          nickname: user?.nickname,
          avatar: formatAvatar(user?.avatar)
        },
        content: comment.content,
        replyTo: replyToUsername,
        likes: 0,
        isLiked: false,
        time: '刚刚'
      }
    })
  } catch (error) {
    console.error('发表评论失败:', error)
    res.status(500).json({ success: false, message: '发表评论失败' })
  }
})

// 删除评论
router.delete('/:postId/comments/:commentId', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const { postId, commentId } = req.params

    const post = await Post.findById(postId)
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' })
    }

    const comment = post.comments.find(c => c._id.toString() === commentId)
    if (!comment) {
      return res.status(404).json({ success: false, message: '评论不存在' })
    }

    if (comment.author.toString() !== userId && post.author.toString() !== userId) {
      return res.status(403).json({ success: false, message: '无权删除此评论' })
    }

    post.comments = post.comments.filter(c => c._id.toString() !== commentId)
    await post.save()

    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除评论失败:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

// 点赞/取消点赞评论
router.post('/:postId/comments/:commentId/like', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId!
    const { postId, commentId } = req.params

    const post = await Post.findById(postId)
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' })
    }

    const comment = post.comments.find(c => c._id.toString() === commentId)
    if (!comment) {
      return res.status(404).json({ success: false, message: '评论不存在' })
    }

    const userObjectId = new Types.ObjectId(userId)
    const isLiked = comment.likes.some(id => id.toString() === userId)

    if (isLiked) {
      comment.likes = comment.likes.filter(id => id.toString() !== userId)
    } else {
      comment.likes.push(userObjectId)
    }

    await post.save()

    res.json({
      success: true,
      isLiked: !isLiked,
      likes: comment.likes.length
    })
  } catch (error) {
    console.error('评论点赞失败:', error)
    res.status(500).json({ success: false, message: '操作失败' })
  }
})

// 获取用户的帖子
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const currentUserId = (req as AuthRequest).userId
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const posts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('author', 'username nickname avatar')
      .lean()

    const formattedPosts = posts.map(post => ({
      id: post._id,
      content: post.content,
      images: post.images.map(img => `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${img}`),
      tags: post.tags,
      likes: post.likes.length,
      isLiked: post.likes.some(id => id.toString() === currentUserId),
      stars: post.stars.length,
      isStarred: post.stars.some(id => id.toString() === currentUserId),
      shares: post.shares,
      commentsCount: post.comments.length,
      time: formatTime(post.createdAt)
    }))

    const total = await Post.countDocuments({ author: userId })

    res.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('获取用户帖子失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 获取用户收藏的帖子
router.get('/starred/list', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const { page = 1, limit = 10 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const posts = await Post.find({ stars: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('author', 'username nickname avatar')
      .lean()

    const formattedPosts = posts.map(post => ({
      id: post._id,
      author: {
        id: (post.author as any)._id,
        username: (post.author as any).username,
        nickname: (post.author as any).nickname,
        avatar: formatAvatar((post.author as any).avatar)
      },
      content: post.content,
      images: post.images.map(img => `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${img}`),
      tags: post.tags,
      likes: post.likes.length,
      isLiked: post.likes.some(id => id.toString() === userId),
      isStarred: true,
      commentsCount: post.comments.length,
      time: formatTime(post.createdAt)
    }))

    const total = await Post.countDocuments({ stars: userId })

    res.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('获取收藏帖子失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 修改帖子（支持图片更新）
router.put('/:id', auth, upload.array('images', 9), async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const { content, tags, visibility, existingImages } = req.body
    const files = req.files as Express.Multer.File[]

    const post = await Post.findById(req.params.id)
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' })
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({ success: false, message: '无权修改此帖子' })
    }

    // 更新内容
    if (content) post.content = content.trim()
    if (tags) post.tags = typeof tags === 'string' ? JSON.parse(tags) : tags
    if (visibility && ['public', 'followers', 'private'].includes(visibility)) {
      post.visibility = visibility
    }

    // 处理图片
    // existingImages 是保留的已有图片URL数组
    // files 是新上传的图片
    const parsedExistingImages = existingImages 
      ? (typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages)
      : []
    
    // 从URL中提取文件名
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000'
    const existingFilenames = parsedExistingImages.map((url: string) => {
      // URL格式: http://localhost:5000/uploads/filename.jpg
      return url.replace(`${baseUrl}/uploads/`, '')
    })
    
    // 新上传的图片文件名
    const newFilenames = files ? files.map(f => f.filename) : []
    
    // 合并图片列表
    post.images = [...existingFilenames, ...newFilenames]

    await post.save()

    res.json({ success: true, message: '修改成功' })
  } catch (error) {
    console.error('修改帖子失败:', error)
    res.status(500).json({ success: false, message: '修改失败' })
  }
})

// 更新帖子可见性
router.put('/:id/visibility', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const { visibility } = req.body

    if (!['public', 'followers', 'private'].includes(visibility)) {
      return res.status(400).json({ success: false, message: '无效的可见性设置' })
    }

    const post = await Post.findById(req.params.id)
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' })
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({ success: false, message: '无权修改此帖子' })
    }

    post.visibility = visibility
    await post.save()

    res.json({ success: true, message: '设置成功', visibility })
  } catch (error) {
    console.error('更新可见性失败:', error)
    res.status(500).json({ success: false, message: '设置失败' })
  }
})

// 获取我的帖子（包含可见性信息）
router.get('/my/list', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const { page = 1, limit = 10 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const posts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean()

    const formattedPosts = posts.map(post => ({
      id: post._id,
      content: post.content,
      images: post.images.map(img => `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${img}`),
      tags: post.tags,
      likes: post.likes.length,
      stars: post.stars.length,
      shares: post.shares,
      commentsCount: post.comments.length,
      visibility: post.visibility || 'public',
      time: formatTime(post.createdAt),
      createdAt: post.createdAt
    }))

    const total = await Post.countDocuments({ author: userId })

    res.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('获取我的帖子失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

export default router
