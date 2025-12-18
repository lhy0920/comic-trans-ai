import { Router, Request, Response } from 'express'

const router = Router()

// 阿里云 DashScope API 配置
const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// AI 聊天接口
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { message, history = [] } = req.body

    if (!message) {
      return res.status(400).json({ success: false, error: '消息不能为空' })
    }

    const apiKey = process.env.DASHSCOPE_API_KEY
    console.log('API Key configured:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET')
    
    if (!apiKey || apiKey === 'your-api-key-here') {
      console.log('Using local reply - API key not configured')
      return res.json({
        success: true,
        reply: getLocalReply(message)
      })
    }

    // 构建消息历史
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `你是一个可爱的漫画推荐助手，名叫"漫画小助手"。你的任务是帮助用户找到喜欢的漫画。
特点：
- 说话可爱活泼，喜欢用表情符号
- 熟悉各种类型的漫画：恋爱、热血、奇幻、悬疑、搞笑等
- 会根据用户喜好推荐漫画
- 回复简洁有趣，不要太长
- 如果用户问非漫画相关的问题，友好地引导回漫画话题`
      },
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content
      })),
      { role: 'user', content: message }
    ]

    // 调用阿里云 DeepSeek API
    const response = await fetch(DASHSCOPE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-v3',
        messages,
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API error:', response.status, errorText)
      return res.json({
        success: true,
        reply: getLocalReply(message)
      })
    }
    
    console.log('DeepSeek API response OK')

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const reply = data.choices?.[0]?.message?.content || getLocalReply(message)

    res.json({ success: true, reply })
  } catch (error) {
    console.error('Chat error:', error)
    res.json({
      success: true,
      reply: getLocalReply(req.body.message || '')
    })
  }
})

// 本地回复（API 不可用时的备用）
function getLocalReply(input: string): string {
  const lowerInput = input.toLowerCase()
  
  if (lowerInput.includes('推荐') || lowerInput.includes('好看')) {
    return '📚 给你推荐几部热门漫画：\n\n• 《异世界冒险记》- 奇幻冒险，评分9.5\n• 《校园青春恋曲》- 甜甜的恋爱故事\n• 《热血格斗王》- 燃爆的格斗漫画\n\n点击下方卡片就能开始看哦～'
  }
  
  if (lowerInput.includes('恋爱') || lowerInput.includes('爱情') || lowerInput.includes('甜')) {
    return '💕 喜欢恋爱漫画呀！推荐你看：\n\n• 《恋爱日记》- 青梅竹马的甜蜜日常\n• 《校园青春恋曲》- 校园纯爱故事'
  }
  
  if (lowerInput.includes('热血') || lowerInput.includes('战斗') || lowerInput.includes('格斗')) {
    return '🔥 热血漫画来啦：\n\n• 《热血格斗王》- 拳拳到肉的格斗\n• 《都市猎人》- 都市动作冒险'
  }
  
  if (lowerInput.includes('更新') || lowerInput.includes('今天')) {
    return '📅 今天更新的漫画有：\n\n• 《星空下的约定》第25话\n• 《魔法少女物语》第37话\n• 《都市猎人》第121话\n\n快去看看吧！'
  }
  
  return '好的，我帮你找找～你可以告诉我想看什么类型的，比如"恋爱"、"热血"、"奇幻"等，或者直接说"推荐"让我给你推荐几部！💕'
}

export default router
