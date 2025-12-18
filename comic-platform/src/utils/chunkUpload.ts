/**
 * 大文件切片上传工具
 */

const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB 每片
const BASE_URL = 'http://localhost:5000/api/upload'

// 计算文件 hash（使用 SparkMD5 或简单 hash）
async function calculateHash(file: File): Promise<string> {
  // 简单 hash：文件名 + 大小 + 最后修改时间
  const str = `${file.name}-${file.size}-${file.lastModified}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

// 切片文件
function createChunks(file: File): Blob[] {
  const chunks: Blob[] = []
  let start = 0
  
  while (start < file.size) {
    chunks.push(file.slice(start, start + CHUNK_SIZE))
    start += CHUNK_SIZE
  }
  
  return chunks
}

export interface UploadProgress {
  loaded: number
  total: number
  percent: number
  status: 'uploading' | 'merging' | 'completed' | 'error'
  currentChunk?: number
  totalChunks?: number
}

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

// 切片上传
export async function chunkUpload(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const token = localStorage.getItem('token')
  
  if (!token) {
    return { success: false, error: '请先登录' }
  }

  try {
    const fileHash = await calculateHash(file)
    const chunks = createChunks(file)
    const totalChunks = chunks.length

    // 检查已上传的切片
    const checkRes = await fetch(`${BASE_URL}/check/${fileHash}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const checkData = await checkRes.json()

    // 已经上传完成
    if (checkData.status === 'completed') {
      onProgress?.({ loaded: file.size, total: file.size, percent: 100, status: 'completed' })
      return { success: true, url: checkData.url }
    }

    const uploadedChunks = new Set(checkData.uploadedChunks || [])
    let uploadedCount = uploadedChunks.size

    // 上传未完成的切片
    for (let i = 0; i < chunks.length; i++) {
      if (uploadedChunks.has(i)) {
        continue // 跳过已上传的切片
      }

      const formData = new FormData()
      formData.append('chunk', chunks[i])
      formData.append('fileHash', fileHash)
      formData.append('chunkIndex', String(i))
      formData.append('totalChunks', String(totalChunks))

      const res = await fetch(`${BASE_URL}/chunk`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })

      if (!res.ok) {
        throw new Error('切片上传失败')
      }

      uploadedCount++
      const percent = Math.round((uploadedCount / totalChunks) * 95) // 留 5% 给合并

      onProgress?.({
        loaded: uploadedCount * CHUNK_SIZE,
        total: file.size,
        percent,
        status: 'uploading',
        currentChunk: i + 1,
        totalChunks
      })
    }

    // 合并切片
    onProgress?.({
      loaded: file.size,
      total: file.size,
      percent: 98,
      status: 'merging'
    })

    const mergeRes = await fetch(`${BASE_URL}/merge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileHash,
        fileName: file.name,
        totalChunks
      })
    })

    if (!mergeRes.ok) {
      throw new Error('合并失败')
    }

    const mergeData = await mergeRes.json()

    onProgress?.({
      loaded: file.size,
      total: file.size,
      percent: 100,
      status: 'completed'
    })

    return { success: true, url: mergeData.url }

  } catch (error) {
    onProgress?.({
      loaded: 0,
      total: file.size,
      percent: 0,
      status: 'error'
    })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '上传失败' 
    }
  }
}
