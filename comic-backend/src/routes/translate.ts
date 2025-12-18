import { Router, Request, Response } from 'express'
import multer from 'multer'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// 阿里云 DashScope API
const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

// 翻译漫画图片
router.post('/image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file
    const targetLang = req.body.targetLang || 'zh'

    if (!file) {
      return res.status(400).json({ success: false, error: '请上传图片' })
    }

    const apiKey = process.env.DASHSCOPE_API_KEY
    if (!apiKey || apiKey === 'your-api-key-here') {
      return res.status(500).json({ success: false, error: 'API Key 未配置' })
    }

    // 将图片转为 base64
    const base64Image = file.buffer.toString('base64')
    const mimeType = file.mimetype || 'image/jpeg'

    // 语言映射
    const langMap: Record<string, string> = {
      'zh': '中文',
      'en': 'English',
      'ja': '日本語',
      'ko': '한국어'
    }
    const targetLangName = langMap[targetLang] || '中文'

    // 调用 DeepSeek 视觉模型
    const response = await fetch(DASHSCOPE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'qwen-vl-max',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              },
              {
                type: 'text',
                text: `这是一张漫画图片。请识别图片中的所有文字（对话框、旁白、音效等），并翻译成${targetLangName}。

请按照漫画的阅读顺序（通常是从右到左、从上到下）识别每一段文字。

对于每段文字，请估算它在图片中的位置：
- x: 文字中心点的横向位置，0表示最左边，100表示最右边
- y: 文字中心点的纵向位置，0表示最上边，100表示最下边

请按以下JSON格式返回（只返回JSON，不要其他内容）：
{
  "texts": [
    {
      "original": "原文内容",
      "translated": "翻译后的文字",
      "x": 75,
      "y": 15
    }
  ],
  "summary": "这一页的剧情简要概括（一句话）"
}

注意：
1. 请识别图片中的所有文字，不要遗漏
2. x和y是百分比数值（0-100的整数）
3. 按阅读顺序排列
如果图片中没有文字，返回：{"texts": [], "summary": "无文字内容"}`
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Vision API error:', response.status, errorText)
      return res.status(500).json({ success: false, error: '翻译服务暂时不可用' })
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }
    
    const content = data.choices?.[0]?.message?.content || ''
    console.log('Vision API response:', content)

    // 解析返回的 JSON
    let result = { texts: [] as Array<{original: string, translated: string, type: string}>, summary: '' }
    try {
      // 尝试提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('Parse error:', e)
      // 如果解析失败，返回原始内容作为翻译结果
      result = {
        texts: [{ original: '', translated: content, type: 'narration' }],
        summary: '翻译完成'
      }
    }

    res.json({
      success: true,
      texts: result.texts,
      summary: result.summary
    })
  } catch (error) {
    console.error('Translate error:', error)
    res.status(500).json({ success: false, error: '翻译失败' })
  }
})

export default router
