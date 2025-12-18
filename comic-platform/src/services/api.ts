
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
