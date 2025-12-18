import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { auth, AuthRequest } from '../middleware/auth'
import { upload } from '../middleware/upload'

const router = Router()

// 切片存储目录
const CHUNK_DIR = path.join(__dirname, '../../uploads/chunks')
const MERGE_DIR = path.join(__dirname, '../../uploads/merged')

// 确保目录存在
if (!fs.existsSync(CHUNK_DIR)) fs.mkdirSync(CHUNK_DIR, { recursive: true })
if (!fs.existsSync(MERGE_DIR)) fs.mkdirSync(MERGE_DIR, { recursive: true })

// 上传切片
router.post('/chunk', auth, upload.single('chunk'), async (req: AuthRequest, res: Response) => {
  try {
    const { fileHash, chunkIndex, totalChunks } = req.body
    
    if (!req.file || !fileHash || chunkIndex === undefined) {
      return res.status(400).json({ message: '参数错误' })
    }

    // 创建文件专属目录
    const chunkDir = path.join(CHUNK_DIR, fileHash)
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true })
    }

    // 移动切片到专属目录
    const chunkPath = path.join(chunkDir, `${chunkIndex}`)
    fs.renameSync(req.file.path, chunkPath)

    res.json({ 
      message: '切片上传成功',
      chunkIndex: Number(chunkIndex),
      totalChunks: Number(totalChunks)
    })
  } catch (error) {
    console.error('切片上传失败:', error)
    res.status(500).json({ message: '切片上传失败', error })
  }
})

// 合并切片
router.post('/merge', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { fileHash, fileName, totalChunks } = req.body
    
    const chunkDir = path.join(CHUNK_DIR, fileHash)
    const ext = path.extname(fileName)
    const mergedFileName = `${fileHash}${ext}`
    const mergedPath = path.join(MERGE_DIR, mergedFileName)

    // 检查所有切片是否存在
    const chunks = fs.readdirSync(chunkDir)
    if (chunks.length !== Number(totalChunks)) {
      return res.status(400).json({ message: '切片不完整' })
    }

    // 按顺序合并切片
    const writeStream = fs.createWriteStream(mergedPath)
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `${i}`)
      const chunkData = fs.readFileSync(chunkPath)
      writeStream.write(chunkData)
    }
    
    writeStream.end()

    // 等待写入完成
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })

    // 删除切片目录
    fs.rmSync(chunkDir, { recursive: true })

    res.json({ 
      message: '合并成功',
      url: `/uploads/merged/${mergedFileName}`,
      fileName: mergedFileName
    })
  } catch (error) {
    console.error('合并失败:', error)
    res.status(500).json({ message: '合并失败', error })
  }
})

// 检查已上传的切片（断点续传）
router.get('/check/:fileHash', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { fileHash } = req.params
    const chunkDir = path.join(CHUNK_DIR, fileHash)
    
    // 检查是否已经合并完成
    const mergedFiles = fs.readdirSync(MERGE_DIR)
    const merged = mergedFiles.find(f => f.startsWith(fileHash))
    if (merged) {
      return res.json({ 
        status: 'completed',
        url: `/uploads/merged/${merged}`
      })
    }

    // 返回已上传的切片索引
    if (fs.existsSync(chunkDir)) {
      const chunks = fs.readdirSync(chunkDir).map(Number).sort((a, b) => a - b)
      return res.json({ status: 'partial', uploadedChunks: chunks })
    }

    res.json({ status: 'none', uploadedChunks: [] })
  } catch (error) {
    res.status(500).json({ message: '检查失败', error })
  }
})

export default router
