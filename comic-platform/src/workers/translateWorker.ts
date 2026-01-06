/**
 * 翻译 Web Worker
 * 负责调用翻译 API，避免阻塞主线程
 */

// Worker 消息类型
interface TranslateTask {
  id: number
  imageData: ArrayBuffer
  fileName: string
  targetLang: string
}

interface WorkerMessage {
  type: 'start' | 'cancel'
  tasks?: TranslateTask[]
}

interface TranslateResult {
  id: number
  success: boolean
  texts?: Array<{ original: string; translated: string; x?: number; y?: number; type?: string }>
  summary?: string
  error?: string
}

interface WorkerResponse {
  type: 'progress' | 'result' | 'complete' | 'cancelled'
  current?: number
  total?: number
  result?: TranslateResult
}

let cancelled = false

// 处理单张图片翻译
async function translateImage(task: TranslateTask): Promise<TranslateResult> {
  try {
    const formData = new FormData()
    const blob = new Blob([task.imageData])
    formData.append('image', blob, task.fileName)
    formData.append('targetLang', task.targetLang)

    const response = await fetch('http://localhost:5000/api/translate/image', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (data.success) {
      return {
        id: task.id,
        success: true,
        texts: data.texts || [],
        summary: data.summary || '',
      }
    } else {
      return {
        id: task.id,
        success: false,
        error: data.error || '翻译失败',
      }
    }
  } catch (error) {
    return {
      id: task.id,
      success: false,
      error: error instanceof Error ? error.message : '网络错误',
    }
  }
}

// 监听主线程消息
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, tasks } = e.data

  if (type === 'cancel') {
    cancelled = true
    self.postMessage({ type: 'cancelled' } as WorkerResponse)
    return
  }

  if (type === 'start' && tasks) {
    cancelled = false
    const total = tasks.length

    for (let i = 0; i < tasks.length; i++) {
      if (cancelled) {
        self.postMessage({ type: 'cancelled' } as WorkerResponse)
        return
      }

      // 报告进度
      self.postMessage({
        type: 'progress',
        current: i + 1,
        total,
      } as WorkerResponse)

      // 翻译图片
      const result = await translateImage(tasks[i])

      // 返回结果
      self.postMessage({
        type: 'result',
        result,
      } as WorkerResponse)
    }

    // 全部完成
    self.postMessage({ type: 'complete' } as WorkerResponse)
  }
}

export {}
