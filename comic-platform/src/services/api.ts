
/**
 * API 服务层 - 对接后端接口
 */
const BASE_URL = 'http://localhost:5000/api'

// 获取 token
const getToken = () => localStorage.getItem('token')

// 通用请求方法
const request = async (url: string, options: RequestInit = {}) => {
  const token = getToken()
  const headers: Record<string, string> = {}

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // 如果不是 FormData，添加 Content-Type
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message || '请求失败')
  }

  return data
}

/**
 * 认证 API
 */
export const authApi = {
  // 登录
  login: (email: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // 注册
  register: (username: string, email: string, password: string) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  // 发送验证码
  sendCode: (email: string) =>
    request('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // 验证验证码
  verifyCode: (email: string, code: string) =>
    request('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  // 获取当前用户
  getMe: () => request('/auth/me'),

  // 修改邮箱
  changeEmail: (newEmail: string, code: string) =>
    request('/auth/change-email', {
      method: 'POST',
      body: JSON.stringify({ newEmail, code }),
    }),

  // 修改密码（使用邮箱验证码）
  changePassword: (code: string, newPassword: string) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ code, newPassword }),
    }),

  // 注销账户
  deleteAccount: () =>
    request('/auth/delete-account', { method: 'DELETE' }),
}

/**
 * 漫画 API
 */
export const comicApi = {
  // 获取漫画列表
  getList: (page = 1, limit = 20, tag?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (tag) params.append('tag', tag)
    return request(`/comics?${params}`)
  },

  // 获取漫画详情
  getDetail: (id: string) => request(`/comics/${id}`),

  // 获取章节内容
  getChapter: (comicId: string, chapterId: string) =>
    request(`/comics/${comicId}/chapter/${chapterId}`),

  // 创建漫画
  create: (formData: FormData) =>
    request('/comics', {
      method: 'POST',
      body: formData,
    }),

  // 上传章节
  uploadChapter: (comicId: string, formData: FormData) =>
    request(`/comics/${comicId}/chapter`, {
      method: 'POST',
      body: formData,
    }),
}

/**
 * 用户相关 API
 */
export interface UpdateProfileData {
  username?: string
  nickname?: string
  signature?: string
  gender?: string
  birthday?: string
  phone?: string
  email?: string
}

export const userApi = {
  // 更新用户信息
  updateProfile: async (data: UpdateProfileData) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await res.json()
    if (!res.ok) {
      throw new Error(result.message || '更新用户信息失败')
    }
    return result
  },

  // 上传头像
  uploadAvatar: async (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    
    const token = localStorage.getItem('token')
    const res = await fetch('http://localhost:5000/api/auth/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || '上传失败')
    return data
  },

  // 上传封面
  uploadCover: async (file: File) => {
    const formData = new FormData()
    formData.append('cover', file)
    
    const token = localStorage.getItem('token')
    const res = await fetch('http://localhost:5000/api/auth/cover', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || '上传失败')
    return data
  },
}

/**
 * 浏览历史 API
 */
export const historyApi = {
  // 获取浏览历史
  getHistory: () => request('/history'),

  // 记录浏览历史
  addHistory: (comicId: string, chapterId: string) =>
    request('/history', {
      method: 'POST',
      body: JSON.stringify({ comicId, chapterId }),
    }),
}

/**
 * 收藏 API
 */
export const collectionApi = {
  // 获取收藏列表
  getCollections: () => request('/collections'),

  // 检查是否已收藏
  checkCollected: (comicId: string) => request(`/collections/check/${comicId}`),

  // 添加收藏
  addCollection: (comicId: string) =>
    request(`/collections/${comicId}`, { method: 'POST' }),

  // 取消收藏
  removeCollection: (comicId: string) =>
    request(`/collections/${comicId}`, { method: 'DELETE' }),

  // 更新阅读进度
  updateProgress: (comicId: string, chapter: number) =>
    request(`/collections/${comicId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ chapter }),
    }),
}

/**
 * 翻译 API（模拟）
 */
export interface TextBlock {
  id: number
  original: string
  translated: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  confidence: number
}

export interface TranslateResult {
  success: boolean
  imageId: string
  textBlocks: TextBlock[]
  summary: string
  characters: string[]
}

export const translateApi = {
  async translateImage(image: File, targetLang: string): Promise<TranslateResult> {
    // TODO: 对接真实后端
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return {
      success: true,
      imageId: `img_${Date.now()}`,
      textBlocks: [
        { id: 1, original: 'おはよう！', translated: '早上好！', x: 15, y: 12, width: 20, height: 6, fontSize: 13, confidence: 0.95 },
        { id: 2, original: '今日はいい天気だね', translated: '今天天气真好呢', x: 55, y: 28, width: 25, height: 8, fontSize: 12, confidence: 0.92 },
      ],
      summary: '主角们在早晨打招呼',
      characters: ['小明', '小红'],
    }
  },
}

/**
 * AI 助手 API（模拟）
 */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const chatApi = {
  async sendMessage(message: string, history: ChatMessage[]): Promise<{ reply: string }> {
    await new Promise((resolve) => setTimeout(resolve, 600))
    
    let reply = ''
    if (message.includes('剧情') || message.includes('总结')) {
      reply = '📖 目前还没有翻译内容，先上传漫画开始翻译吧！'
    } else if (message.includes('人物') || message.includes('角色')) {
      reply = '👥 还没有识别到角色呢，翻译更多内容后我就能记住啦～'
    } else {
      reply = '好的，我记下了！还有什么想问的吗？💕'
    }
    
    return { reply }
  },
}

/**
 * 收藏夹 API
 */
export const folderApi = {
  async getFolders(): Promise<{ id: number; name: string; count: number }[]> {
    const saved = localStorage.getItem('comicFolders')
    return saved ? JSON.parse(saved) : []
  },

  async createFolder(name: string): Promise<{ id: number; name: string }> {
    return { id: Date.now(), name }
  },
}


/**
 * 帖子/社区 API
 */
export const postApi = {
  // 获取帖子列表
  getPosts: (page = 1, limit = 10, tab = 'all') => {
    const params = new URLSearchParams({ 
      page: String(page), 
      limit: String(limit),
      tab 
    })
    return request(`/posts?${params}`)
  },

  // 获取单个帖子详情
  getPost: (id: string) => request(`/posts/${id}`),

  // 发布帖子
  createPost: async (title: string, content: string, images: File[], tags: string[], visibility: 'public' | 'followers' | 'private' = 'public') => {
    const formData = new FormData()
    formData.append('title', title)
    formData.append('content', content)
    formData.append('tags', JSON.stringify(tags))
    formData.append('visibility', visibility)
    images.forEach(img => formData.append('images', img))
    
    return request('/posts', {
      method: 'POST',
      body: formData,
    })
  },

  // 删除帖子
  deletePost: (id: string) => 
    request(`/posts/${id}`, { method: 'DELETE' }),

  // 点赞/取消点赞帖子
  toggleLike: (id: string) => 
    request(`/posts/${id}/like`, { method: 'POST' }),

  // 收藏/取消收藏帖子
  toggleStar: (id: string) => 
    request(`/posts/${id}/star`, { method: 'POST' }),

  // 分享帖子
  sharePost: (id: string) => 
    request(`/posts/${id}/share`, { method: 'POST' }),

  // 获取帖子评论
  getComments: (postId: string) => 
    request(`/posts/${postId}/comments`),

  // 发表评论
  addComment: (postId: string, content: string, replyTo?: string) => 
    request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, replyTo }),
    }),

  // 删除评论
  deleteComment: (postId: string, commentId: string) => 
    request(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),

  // 点赞/取消点赞评论
  toggleCommentLike: (postId: string, commentId: string) => 
    request(`/posts/${postId}/comments/${commentId}/like`, { method: 'POST' }),

  // 获取用户的帖子
  getUserPosts: (userId: string, page = 1, limit = 10) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    return request(`/posts/user/${userId}?${params}`)
  },

  // 获取收藏的帖子
  getStarredPosts: (page = 1, limit = 10) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    return request(`/posts/starred/list?${params}`)
  },
}


/**
 * 关注 API
 */
export const followApi = {
  // 关注/取消关注
  toggleFollow: (userId: string) =>
    request(`/follow/${userId}`, { method: 'POST' }),

  // 获取关注列表
  getFollowing: (userId?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    const path = userId ? `/follow/following/${userId}` : '/follow/following'
    return request(`${path}?${params}`)
  },

  // 获取粉丝列表
  getFollowers: (userId?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    const path = userId ? `/follow/followers/${userId}` : '/follow/followers'
    return request(`${path}?${params}`)
  },

  // 获取关注/粉丝数量
  getCount: (userId?: string) => {
    const path = userId ? `/follow/count/${userId}` : '/follow/count'
    return request(path)
  },

  // 检查是否关注
  checkFollow: (userId: string) =>
    request(`/follow/check/${userId}`),
}

// 扩展 postApi
export const myPostApi = {
  // 获取我的帖子
  getMyPosts: (page = 1, limit = 10) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    return request(`/posts/my/list?${params}`)
  },

  // 修改帖子
  updatePost: (id: string, content: string, tags: string[]) =>
    request(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content, tags }),
    }),

  // 修改帖子（带图片）
  updatePostWithImages: async (
    id: string,
    title: string,
    content: string, 
    tags: string[], 
    visibility: 'public' | 'followers' | 'private',
    newImages: File[],
    existingImageUrls: string[]
  ) => {
    const formData = new FormData()
    formData.append('title', title)
    formData.append('content', content)
    formData.append('tags', JSON.stringify(tags))
    formData.append('visibility', visibility)
    formData.append('existingImages', JSON.stringify(existingImageUrls))
    newImages.forEach(img => formData.append('images', img))
    
    const token = localStorage.getItem('token')
    const res = await fetch(`http://localhost:5000/api/posts/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || '更新失败')
    return data
  },

  // 更新帖子可见性
  updateVisibility: (id: string, visibility: 'public' | 'followers' | 'private') =>
    request(`/posts/${id}/visibility`, {
      method: 'PUT',
      body: JSON.stringify({ visibility }),
    }),
}

/**
 * 短链接 API
 */
export const shortLinkApi = {
  // 创建短链接
  create: (url: string) =>
    request('/shortlink/create', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  // 批量创建短链接
  batchCreate: (urls: string[]) =>
    request('/shortlink/batch', {
      method: 'POST',
      body: JSON.stringify({ urls }),
    }),

  // 获取我的短链接列表
  getMyLinks: (page = 1, limit = 20) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    return request(`/shortlink/my?${params}`)
  },

  // 删除短链接
  delete: (hash: string) =>
    request(`/shortlink/${hash}`, { method: 'DELETE' }),
}

/**
 * 用户空间 API（查看他人主页）
 */
export const userSpaceApi = {
  // 获取用户公开信息
  getUserInfo: (userId: string) =>
    request(`/auth/user/${userId}`),

  // 获取用户帖子（带权限过滤）
  getUserPosts: (userId: string, page = 1, limit = 50) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    return request(`/posts/user/${userId}?${params}`)
  },
}


/**
 * 消息 API
 */
export const messageApi = {
  // 获取会话列表
  getConversations: () => request('/messages/conversations'),

  // 获取聊天记录
  getChatHistory: (userId: string, page = 1, limit = 30) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    return request(`/messages/chat/${userId}?${params}`)
  },

  // 发送私信（HTTP 方式，WebSocket 更推荐）
  sendMessage: (receiverId: string, content: string, type: 'text' | 'image' = 'text') =>
    request('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ receiverId, content, type }),
    }),

  // 获取通知列表
  getNotifications: (page = 1, limit = 20, type?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (type) params.append('type', type)
    return request(`/messages/notifications?${params}`)
  },

  // 标记通知已读
  markNotificationsRead: (ids?: string[]) =>
    request('/messages/notifications/read', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    }),

  // 获取未读数量
  getUnreadCount: () => request('/messages/unread-count'),

  // 删除通知
  deleteNotification: (id: string) =>
    request(`/messages/notifications/${id}`, { method: 'DELETE' }),
}

/**
 * 举报 API
 */
export const reportApi = {
  // 举报帖子
  reportPost: (postId: string, reason: string, description?: string) =>
    request('/reports/post', {
      method: 'POST',
      body: JSON.stringify({ postId, reason, description }),
    }),

  // 举报用户
  reportUser: (userId: string, reason: string, description?: string) =>
    request('/reports/user', {
      method: 'POST',
      body: JSON.stringify({ userId, reason, description }),
    }),
}
