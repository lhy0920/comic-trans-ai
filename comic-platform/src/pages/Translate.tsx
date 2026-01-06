import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Upload,
  Languages,
  Send,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageCircleHeart,
  FolderPlus,
  Folder,
} from 'lucide-react'
import { VirtuosoGrid } from 'react-virtuoso'

import { translateApi, chatApi, type TextBlock } from '../services/api'
import { chunkUpload, type UploadProgress } from '../utils/chunkUpload'
import { parsePDF, isPDF } from '../utils/pdfParser'
import { convertToWebP, blobToWebP } from '../utils/imageConverter'
import {
  initFolderDB,
  saveFolder,
  getAllFolders,
  saveImage,
  getImagesByFolder,
  updateFolderImageCount,
  deleteFolder,
  type StoredFolder,
  type StoredImage,
} from '../utils/folderStorage'
import './Translate.css'

// 翻译缓存类型
interface TranslateCache {
  characters: string[]
  plotSummary: string[]
  lastContext: string
}

// 消息类型
interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// 上传的漫画
interface ComicImage {
  id: number
  file: File
  preview: string // 懒加载时为空，需要时才生成
  textBlocks?: TextBlock[]
  status: 'pending' | 'uploading' | 'translating' | 'done' | 'error'
  error?: string
  uploadProgress?: number
  uploadedUrl?: string
  loaded?: boolean // 是否已加载预览图
}

// 收藏夹（UI用）
interface UIFolder {
  id: number
  name: string
  createdAt: Date
  imageCount: number
}

const LANGUAGES = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
]

// 全局 URL 缓存，避免重复创建
const blobUrlCache = new Map<number, string>()

// 获取或创建 blob URL
const getBlobUrl = (imageId: number, blob: Blob | null): string | null => {
  if (!blob) return null
  if (blobUrlCache.has(imageId)) {
    return blobUrlCache.get(imageId)!
  }
  const url = URL.createObjectURL(blob)
  blobUrlCache.set(imageId, url)
  return url
}

// 最大可选图片数量
const MAX_SELECT_COUNT = 8

function Translate() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // 收藏夹相关（从 IndexedDB 加载）
  const [folders, setFolders] = useState<UIFolder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null)
  const [folderImages, setFolderImages] = useState<StoredImage[]>([]) // 当前选中文件夹的图片
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null)
  
  // 右键菜单相关
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, folderId: number} | null>(null)
  const [editingFolder, setEditingFolder] = useState<{id: number, name: string} | null>(null)
  
  // 图片选择和翻译相关
  const [selectedImageIds, setSelectedImageIds] = useState<Record<number, boolean>>({}) // 选中的图片ID集合
  const [isTranslating, setIsTranslating] = useState(false)
  const [translateProgress, setTranslateProgress] = useState('')
  const [translatedResults, setTranslatedResults] = useState<Array<{
    imageId: number
    blob: Blob
    texts: Array<{original: string, translated: string, type: string}>
    summary: string
  }>>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveTargetFolder, setSaveTargetFolder] = useState<number | null>(null)
  const translateWorkerRef = useRef<Worker | null>(null)

  const [images, setImages] = useState<ComicImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [targetLang, setTargetLang] = useState('zh')
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatInput, setChatInput] = useState('')

  // 全屏查看（收藏夹图片阅读模式）
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content:
        '你好呀～我是你的漫画小助手 ✨ 有什么想问的尽管说！我可以帮你总结剧情、解释人物关系哦～',
      timestamp: new Date(),
    },
  ])

  const [cache, setCache] = useState<TranslateCache>(() => {
    const saved = localStorage.getItem('translateCache')
    return saved
      ? JSON.parse(saved)
      : { characters: [], plotSummary: [], lastContext: '' }
  })

  // 注意：收藏夹数据现在保存在 IndexedDB，不再使用 localStorage

  useEffect(() => {
    localStorage.setItem('translateCache', JSON.stringify(cache))
  }, [cache])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 初始化：从 IndexedDB 加载收藏夹，并迁移旧数据
  useEffect(() => {
    const loadFolders = async () => {
      await initFolderDB()
      
      // 检查是否有旧的 localStorage 数据需要迁移
      const oldFoldersStr = localStorage.getItem('comicFolders')
      if (oldFoldersStr) {
        try {
          const oldFolders = JSON.parse(oldFoldersStr)
          // 检查 IndexedDB 是否为空
          const existingFolders = await getAllFolders()
          if (existingFolders.length === 0 && oldFolders.length > 0) {
            console.log('迁移旧收藏夹数据到 IndexedDB...')
            // 迁移旧收藏夹（只迁移文件夹信息，图片数据已丢失）
            for (const oldFolder of oldFolders) {
              const folder: StoredFolder = {
                id: oldFolder.id,
                name: oldFolder.name,
                createdAt: new Date(oldFolder.createdAt).getTime(),
                imageCount: 0, // 图片数据已丢失，重置为0
              }
              await saveFolder(folder)
            }
            // 迁移完成后清除旧数据
            localStorage.removeItem('comicFolders')
            console.log('迁移完成')
          }
        } catch (e) {
          console.error('迁移旧数据失败:', e)
        }
      }
      
      const storedFolders = await getAllFolders()
      setFolders(storedFolders.map(f => ({
        id: f.id,
        name: f.name,
        createdAt: new Date(f.createdAt),
        imageCount: f.imageCount
      })))
    }
    loadFolders()
  }, [])

  // 选中文件夹时加载图片，并清理旧缓存
  useEffect(() => {
    const loadFolderImages = async () => {
      // 清理旧文件夹的 blob URLs
      folderImages.forEach(img => {
        const url = blobUrlCache.get(img.id)
        if (url) {
          URL.revokeObjectURL(url)
          blobUrlCache.delete(img.id)
        }
      })
      
      if (selectedFolder) {
        const imgs = await getImagesByFolder(selectedFolder)
        setFolderImages(imgs)
        // 清空选中状态
        setSelectedImageIds({})
      } else {
        setFolderImages([])
      }
    }
    loadFolderImages()
  }, [selectedFolder])

  // 处理文件选择 - 先弹出收藏夹选择
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setPendingFiles(files)
    setShowFolderModal(true)
  }

  // PDF 解析状态（用于上传区域显示进度）
  const [pdfParsing] = useState(false)
  const [pdfProgress] = useState({ current: 0, total: 0 })
  const [converting] = useState(false)
  
  // 上传中弹窗
  const [uploadingModal, setUploadingModal] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')

  // 将翻译文字渲染到图片上（在原文位置旁边）
  const renderTranslatedImage = async (
    originalBlob: Blob,
    texts: Array<{original: string, translated: string, x?: number, y?: number}>
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        canvas.width = img.width
        canvas.height = img.height
        
        // 绘制原图
        ctx.drawImage(img, 0, 0)
        
        // 根据图片大小计算字体大小（适应不同尺寸的图片）
        const baseFontSize = Math.max(40, Math.min(20, Math.min(img.width, img.height) / 10))
        
        // 记录已占用的区域，避免重叠
        const occupiedAreas: Array<{x: number, y: number, w: number, h: number}> = []
        
        // 检查是否与已有区域重叠
        const isOverlapping = (x: number, y: number, w: number, h: number): boolean => {
          return occupiedAreas.some(area => {
            return !(x + w < area.x || x > area.x + area.w || 
                     y + h < area.y || y > area.y + area.h)
          })
        }
        
        // 找到不重叠的位置
        const findNonOverlappingPosition = (
          targetX: number, targetY: number, boxW: number, boxH: number
        ): {x: number, y: number} => {
          // 尝试原位置
          if (!isOverlapping(targetX, targetY, boxW, boxH)) {
            return {x: targetX, y: targetY}
          }
          
          // 尝试向下偏移
          for (let offset = 20; offset < img.height / 2; offset += 20) {
            if (targetY + offset + boxH < img.height && 
                !isOverlapping(targetX, targetY + offset, boxW, boxH)) {
              return {x: targetX, y: targetY + offset}
            }
          }
          
          // 尝试向右偏移
          for (let offset = 20; offset < img.width / 2; offset += 20) {
            if (targetX + offset + boxW < img.width && 
                !isOverlapping(targetX + offset, targetY, boxW, boxH)) {
              return {x: targetX + offset, y: targetY}
            }
          }
          
          // 实在找不到就用原位置
          return {x: targetX, y: targetY}
        }
        
        // 在每个文字位置绘制翻译
        texts.forEach((t, index) => {
          if (!t.translated) return
          
          // 计算位置（百分比转像素）
          // x, y 是文字中心点，需要转换为左上角
          const centerX = ((t.x ?? 50) / 100) * img.width
          const centerY = ((t.y ?? 50) / 100) * img.height
          
          // 计算文字宽度，自动换行
          ctx.font = `bold ${baseFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
          const maxWidth = Math.min(img.width * 0.55, 400) // 最大宽度
          const lines = wrapText(ctx, `${index + 1}. ${t.translated}`, maxWidth)
          
          const lineHeight = baseFontSize * 1.4
          const padding = 8
          const totalHeight = lines.length * lineHeight + padding * 2
          const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
          const boxWidth = maxLineWidth + padding * 2
          
          // 计算文字框左上角位置（从中心点偏移）
          let boxX = centerX - boxWidth / 2
          let boxY = centerY - totalHeight / 2
          
          // 确保不超出边界
          boxX = Math.max(5, Math.min(img.width - boxWidth - 5, boxX))
          boxY = Math.max(5, Math.min(img.height - totalHeight - 5, boxY))
          
          // 找到不重叠的位置
          const pos = findNonOverlappingPosition(boxX, boxY, boxWidth, totalHeight)
          boxX = pos.x
          boxY = pos.y
          
          // 记录占用区域
          occupiedAreas.push({x: boxX, y: boxY, w: boxWidth, h: totalHeight})
          
          // 绘制半透明背景
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
          ctx.strokeStyle = 'rgba(255, 107, 139, 0.9)'
          ctx.lineWidth = 2
          
          // 圆角矩形
          const radius = 6
          ctx.beginPath()
          ctx.roundRect(boxX, boxY, boxWidth, totalHeight, radius)
          ctx.fill()
          ctx.stroke()
          
          // 绘制翻译文字
          ctx.fillStyle = '#333'
          ctx.font = `bold ${baseFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
          
          lines.forEach((line, i) => {
            ctx.fillText(line, boxX + padding, boxY + padding + baseFontSize + i * lineHeight)
          })
        })
        
        // 转换为 Blob
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        }, 'image/webp', 0.92)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(originalBlob)
    })
  }
  
  // 文字换行辅助函数
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const lines: string[] = []
    let currentLine = ''
    
    for (const char of text) {
      const testLine = currentLine + char
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = char
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)
    return lines
  }

  // 切换图片选中状态（最多选择8张）
  const toggleImageSelect = useCallback((id: number) => {
    setSelectedImageIds(prev => {
      const newState = { ...prev }
      if (newState[id]) {
        delete newState[id]
      } else if (Object.keys(newState).length < MAX_SELECT_COUNT) {
        newState[id] = true
      }
      return newState
    })
  }, [])

  // 获取选中数量
  const selectedCount = Object.keys(selectedImageIds).length

  // 事件委托：处理图片网格点击
  const handleImageGridClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const imageItem = target.closest('[data-image-id]') as HTMLElement
    if (!imageItem) return
    
    const imageId = Number(imageItem.dataset.imageId)
    const index = Number(imageItem.dataset.index)
    const isCheckbox = target.closest('[data-action="checkbox"]')
    
    if (isCheckbox) {
      // 点击勾选框 -> 切换选中
      toggleImageSelect(imageId)
    } else {
      // 点击图片 -> 进入阅读模式
      setViewerIndex(index)
      setViewerOpen(true)
    }
  }, [toggleImageSelect])

  // 翻译选中的图片（使用 Web Worker）
  const handleTranslateSelected = async () => {
    if (selectedCount === 0) return
    
    const selectedIds = Object.keys(selectedImageIds).map(Number)
    const selectedImages = selectedIds
      .map(id => folderImages.find(img => img.id === id))
      .filter((img): img is StoredImage => !!img && !!img.blob)
    
    if (selectedImages.length === 0) return
    
    setIsTranslating(true)
    setTranslateProgress(`准备翻译 ${selectedImages.length} 张图片...`)
    setTranslatedResults([])
    
    // 创建 Worker
    const worker = new Worker(
      new URL('../workers/translateWorker.ts', import.meta.url),
      { type: 'module' }
    )
    translateWorkerRef.current = worker
    
    // 准备任务数据
    const tasks: Array<{id: number, imageData: ArrayBuffer, fileName: string, targetLang: string}> = []
    for (const img of selectedImages) {
      const arrayBuffer = await img.blob.arrayBuffer()
      tasks.push({
        id: img.id,
        imageData: arrayBuffer,
        fileName: img.fileName,
        targetLang,
      })
    }
    
    // 监听 Worker 消息
    worker.onmessage = async (e) => {
      const { type, current, total, result } = e.data
      
      if (type === 'progress') {
        setTranslateProgress(`正在翻译 ${current}/${total} 张图片...`)
      }
      
      if (type === 'result' && result) {
        if (result.success) {
          // 找到原图并渲染翻译文字
          const originalImage = selectedImages.find(img => img.id === result.id)
          if (originalImage && originalImage.blob) {
            try {
              const translatedBlob = await renderTranslatedImage(originalImage.blob, result.texts || [])
              setTranslatedResults(prev => [...prev, {
                imageId: result.id,
                blob: translatedBlob,
                texts: result.texts || [],
                summary: result.summary || ''
              }])
            } catch (err) {
              console.error('渲染翻译图片失败:', err)
            }
          }
        }
      }
      
      if (type === 'complete') {
        setTranslateProgress('翻译完成！')
        setTimeout(() => {
          setIsTranslating(false)
          setShowSaveModal(true)
        }, 500)
        worker.terminate()
        translateWorkerRef.current = null
      }
      
      if (type === 'cancelled') {
        setTranslateProgress('已取消')
        setTimeout(() => setIsTranslating(false), 500)
        worker.terminate()
        translateWorkerRef.current = null
      }
    }
    
    // 发送任务给 Worker
    worker.postMessage({ type: 'start', tasks })
  }
  
  // 取消翻译
  const cancelTranslate = () => {
    if (translateWorkerRef.current) {
      translateWorkerRef.current.postMessage({ type: 'cancel' })
    }
    setIsTranslating(false)
  }
  
  // 保存翻译结果到收藏夹
  const saveTranslatedImages = async () => {
    if (translatedResults.length === 0 || !saveTargetFolder) return
    
    for (const result of translatedResults) {
      const storedImage: StoredImage = {
        id: Date.now() + Math.random(),
        folderId: saveTargetFolder,
        fileName: `translated_${result.imageId}.webp`,
        blob: result.blob,
        status: 'done',
        createdAt: Date.now(),
      }
      await saveImage(storedImage)
    }
    
    await updateFolderImageCount(saveTargetFolder)
    
    // 刷新收藏夹
    const storedFolders = await getAllFolders()
    setFolders(storedFolders.map(f => ({
      id: f.id,
      name: f.name,
      createdAt: new Date(f.createdAt),
      imageCount: f.imageCount
    })))
    
    // 如果保存到当前文件夹，刷新图片列表
    if (saveTargetFolder === selectedFolder) {
      const imgs = await getImagesByFolder(selectedFolder)
      setFolderImages(imgs)
    }
    
    setShowSaveModal(false)
    setTranslatedResults([])
    setSaveTargetFolder(null)
    setSelectedImageIds({})
  }

  // 右键菜单处理
  const handleFolderContextMenu = (e: React.MouseEvent, folderId: number) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, folderId })
  }

  // 关闭右键菜单
  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // 删除收藏夹
  const handleDeleteFolder = async () => {
    if (!contextMenu) return
    
    const folder = folders.find(f => f.id === contextMenu.folderId)
    if (!folder) return
    
    if (window.confirm(`确定要删除收藏夹"${folder.name}"吗？\n其中的所有图片也会被删除。`)) {
      await deleteFolder(contextMenu.folderId)
      
      // 刷新收藏夹列表
      const storedFolders = await getAllFolders()
      setFolders(storedFolders.map(f => ({
        id: f.id,
        name: f.name,
        createdAt: new Date(f.createdAt),
        imageCount: f.imageCount
      })))
      
      // 如果删除的是当前选中的文件夹，清空选择
      if (selectedFolder === contextMenu.folderId) {
        setSelectedFolder(null)
        setFolderImages([])
      }
    }
    closeContextMenu()
  }

  // 开始重命名
  const handleRenameFolder = () => {
    if (!contextMenu) return
    const folder = folders.find(f => f.id === contextMenu.folderId)
    if (folder) {
      setEditingFolder({ id: folder.id, name: folder.name })
    }
    closeContextMenu()
  }

  // 保存重命名
  const saveRename = async () => {
    if (!editingFolder || !editingFolder.name.trim()) return
    
    const folder = folders.find(f => f.id === editingFolder.id)
    if (folder) {
      const updatedFolder: StoredFolder = {
        id: folder.id,
        name: editingFolder.name.trim(),
        createdAt: folder.createdAt.getTime(),
        imageCount: folder.imageCount
      }
      await saveFolder(updatedFolder)
      
      // 刷新列表
      const storedFolders = await getAllFolders()
      setFolders(storedFolders.map(f => ({
        id: f.id,
        name: f.name,
        createdAt: new Date(f.createdAt),
        imageCount: f.imageCount
      })))
    }
    setEditingFolder(null)
  }

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    const handleClick = () => closeContextMenu()
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  // 确认添加到收藏夹
  const confirmAddFiles = async () => {
    if (!pendingFiles || !selectedFolder) return

    const files = Array.from(pendingFiles)
    const newImages: ComicImage[] = []

    // 显示上传中弹窗
    setShowFolderModal(false)
    setUploadingModal(true)
    setUploadStatus('正在处理文件...')

    try {
      // 处理图片文件 - 转换为 WebP（不生成预览图，节省内存）
      const imageFiles = files.filter((file) => file.type.startsWith('image/'))
      for (let i = 0; i < imageFiles.length; i++) {
        setUploadStatus(`转换图片 ${i + 1}/${imageFiles.length}`)
        try {
          const { file: webpFile } = await convertToWebP(imageFiles[i], { quality: 0.85 })
          newImages.push({
            id: Date.now() + i,
            file: webpFile,
            preview: '', // 不预先生成预览图
            status: 'pending',
            loaded: false,
          })
        } catch {
          newImages.push({
            id: Date.now() + i,
            file: imageFiles[i],
            preview: '',
            status: 'pending',
            loaded: false,
          })
        }
      }

      // 处理 PDF 文件
      const pdfFiles = files.filter((file) => isPDF(file))
      if (pdfFiles.length > 0) {
        for (const pdfFile of pdfFiles) {
          setUploadStatus(`解析 PDF: ${pdfFile.name}`)
          try {
            const pages = await parsePDF(pdfFile, (current, total) => {
              setUploadStatus(`解析 PDF ${current}/${total} 页`)
            })
            
            for (let i = 0; i < pages.length; i++) {
              const page = pages[i]
              const { file: webpFile } = await blobToWebP(
                page.blob,
                `${pdfFile.name}_page${page.pageNumber}.webp`,
                { quality: 0.85 }
              )
              // 释放 PDF 页面的预览 URL
              URL.revokeObjectURL(page.preview)
              
              newImages.push({
                id: Date.now() + imageFiles.length + i,
                file: webpFile,
                preview: '',
                status: 'pending',
                loaded: false,
              })
            }
          } catch (error) {
            console.error('PDF 解析失败:', error)
          }
        }
      }

      setUploadStatus('保存到收藏夹...')
      
      // 保存图片到 IndexedDB
      for (const img of newImages) {
        const storedImage: StoredImage = {
          id: img.id,
          folderId: selectedFolder,
          fileName: img.file.name,
          blob: img.file,
          status: img.status,
          createdAt: Date.now(),
        }
        await saveImage(storedImage)
      }
      
      // 更新收藏夹图片数量
      await updateFolderImageCount(selectedFolder)
      
      // 刷新收藏夹列表
      const storedFolders = await getAllFolders()
      setFolders(storedFolders.map(f => ({
        id: f.id,
        name: f.name,
        createdAt: new Date(f.createdAt),
        imageCount: f.imageCount
      })))
      
      // 刷新当前文件夹图片
      const imgs = await getImagesByFolder(selectedFolder)
      setFolderImages(imgs)
      
      // 图片已保存到 IndexedDB 收藏夹，不需要添加到页面的临时列表
      // 用户可以从收藏夹中选择图片进行翻译
      
    } finally {
      setUploadingModal(false)
      setPendingFiles(null)
      setNewFolderName('')
    }
  }

  // 创建新收藏夹
  const createFolder = async () => {
    if (!newFolderName.trim()) return
    
    const newFolder: StoredFolder = {
      id: Date.now(),
      name: newFolderName.trim(),
      createdAt: Date.now(),
      imageCount: 0,
    }
    
    // 保存到 IndexedDB
    await saveFolder(newFolder)
    
    // 更新 UI
    setFolders((prev) => [...prev, {
      id: newFolder.id,
      name: newFolder.name,
      createdAt: new Date(newFolder.createdAt),
      imageCount: 0
    }])
    setSelectedFolder(newFolder.id)
    setNewFolderName('')
    
    // 如果有待上传的文件，不关闭弹窗，让用户点确认
    // 如果没有待上传文件（单独创建收藏夹），则关闭弹窗
    if (!pendingFiles) {
      setShowFolderModal(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesSelected(e.target.files)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFilesSelected(e.dataTransfer.files)
  }

  const removeImage = (id: number) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  const handleTranslate = async () => {
    if (images.length === 0) return

    // 获取待翻译的图片
    const pendingImages = images.filter((img) => img.status === 'pending')
    if (pendingImages.length === 0) return

    // 逐个上传并翻译
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      if (img.status !== 'pending') continue

      try {
        // 1. 先上传文件（大文件切片上传）
        setImages((prev) =>
          prev.map((item) =>
            item.id === img.id ? { ...item, status: 'uploading', uploadProgress: 0 } : item
          )
        )

        const uploadResult = await chunkUpload(img.file, (progress: UploadProgress) => {
          setImages((prev) =>
            prev.map((item) =>
              item.id === img.id ? { ...item, uploadProgress: progress.percent } : item
            )
          )
        })

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || '上传失败')
        }

        // 2. 上传成功后翻译
        setImages((prev) =>
          prev.map((item) =>
            item.id === img.id
              ? { ...item, status: 'translating', uploadedUrl: uploadResult.url }
              : item
          )
        )

        // 调用翻译API
        const result = await translateApi.translateImage(img.file, targetLang)

        if (result.success) {
          setImages((prev) =>
            prev.map((item) =>
              item.id === img.id
                ? { ...item, status: 'done', textBlocks: result.textBlocks }
                : item
            )
          )

          // 更新缓存
          setCache((prev) => ({
            characters: [...new Set([...prev.characters, ...result.characters])],
            plotSummary: [...prev.plotSummary, result.summary],
            lastContext: prev.lastContext + `\n第${i + 1}页：${result.summary}`,
          }))
        } else {
          throw new Error('翻译失败')
        }
      } catch (error) {
        setImages((prev) =>
          prev.map((item) =>
            item.id === img.id
              ? { ...item, status: 'error', error: error instanceof Error ? error.message : '处理失败' }
              : item
          )
        )
      }
    }
  }

  // 重试翻译失败的图片
  const retryTranslate = (imageId: number) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, status: 'pending', error: undefined } : img
      )
    )
  }



  // 键盘和滚轮导航（阅读模式）
  useEffect(() => {
    if (!viewerOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setViewerIndex(prev => Math.max(0, prev - 1))
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setViewerIndex(prev => Math.min(folderImages.length - 1, prev + 1))
      }
      if (e.key === 'Escape') setViewerOpen(false)
    }

    // 滚轮切换图片
    let wheelTimeout: ReturnType<typeof setTimeout> | null = null
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      // 防抖，避免滚动太快
      if (wheelTimeout) return
      wheelTimeout = setTimeout(() => {
        wheelTimeout = null
      }, 150)

      if (e.deltaY > 0) {
        // 向下滚动，下一张
        setViewerIndex(prev => Math.min(folderImages.length - 1, prev + 1))
      } else if (e.deltaY < 0) {
        // 向上滚动，上一张
        setViewerIndex(prev => Math.max(0, prev - 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', handleWheel)
      if (wheelTimeout) clearTimeout(wheelTimeout)
    }
  }, [viewerOpen, folderImages.length])

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    const messageText = chatInput
    setChatInput('')

    try {
      // 调用AI助手API
      const response = await chatApi.sendMessage(
        messageText,
        messages.map((m) => ({ role: m.role, content: m.content }))
      )

      const aiMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch {
      const errorMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '抱歉，我遇到了一些问题，请稍后再试～',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    }
  }

  return (
    <div className="translate-page">
      {/* 主要内容 */}
      <main className="translate-main">
        {/* 上传区域 */}
        <div
          className={`upload-zone ${isDragging ? 'dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            multiple
            onChange={handleFileSelect}
            hidden
          />
          <Upload size={40} strokeWidth={1.5} />
          <p>{isDragging ? '松开即可上传～' : '点击或拖拽上传漫画图片'}</p>
          <span>支持 JPG、PNG、PDF 格式，自动转换为 WebP</span>
          {converting && !pdfParsing && (
            <div className="pdf-parsing">正在转换图片格式...</div>
          )}
          {pdfParsing && (
            <div className="pdf-parsing">
              正在解析 PDF... {pdfProgress.current}/{pdfProgress.total} 页
            </div>
          )}
        </div>

        {/* 语言选择 */}
        <div className="lang-selector">
          <Languages size={18} strokeWidth={1.5} />
          <span>翻译为：</span>
          <div className="lang-dropdown">
            <button
              className="lang-btn"
              onClick={() => setShowLangDropdown(!showLangDropdown)}
            >
              {LANGUAGES.find((l) => l.code === targetLang)?.name}
              <ChevronDown size={16} strokeWidth={1.5} />
            </button>
            {showLangDropdown && (
              <div className="lang-options">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    className={targetLang === lang.code ? 'active' : ''}
                    onClick={() => {
                      setTargetLang(lang.code)
                      setShowLangDropdown(false)
                    }}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 图片列表 */}
        {images.length > 0 && (
          <div className="image-list">
            {images.map((img, index) => (
              <div
                key={img.id}
                className={`image-item ${img.status}`}
                onClick={() => console.log('查看图片', index)}
              >
                <img src={img.preview} alt="漫画" />
                {img.status === 'uploading' && (
                  <div className="image-overlay uploading">
                    <div className="upload-progress">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${img.uploadProgress || 0}%` }} 
                      />
                    </div>
                    <span className="progress-text">{img.uploadProgress || 0}%</span>
                  </div>
                )}
                {img.status === 'translating' && (
                  <div className="image-overlay">
                    <div className="loading-spinner" />
                    <span className="status-text">翻译中...</span>
                  </div>
                )}
                {img.status === 'done' && (
                  <div className="translated-badge">已翻译</div>
                )}
                {img.status === 'error' && (
                  <div
                    className="error-overlay"
                    onClick={(e) => {
                      e.stopPropagation()
                      retryTranslate(img.id)
                    }}
                  >
                    <span>{img.error || '处理失败'}</span>
                    <span className="retry-text">点击重试</span>
                  </div>
                )}
                <button
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeImage(img.id)
                  }}
                >
                  <X size={14} strokeWidth={2} />
                </button>
                <span className="image-index">{index + 1}</span>
              </div>
            ))}
          </div>
        )}

        {/* 翻译按钮 */}
        {images.length > 0 && (
          <button className="translate-btn" onClick={handleTranslate}>
            <Languages size={20} strokeWidth={1.5} />
            开始翻译
          </button>
        )}

        {/* 我的收藏夹 */}
        {folders.length > 0 && (
          <section className="my-folders">
            <h3 className="folders-title">
              <Folder size={18} strokeWidth={1.5} />
              我的收藏夹
            </h3>
            <div className="folders-grid">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`folder-card ${selectedFolder === folder.id ? 'active' : ''}`}
                  onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                  onContextMenu={(e) => handleFolderContextMenu(e, folder.id)}
                >
                  <Folder size={24} strokeWidth={1.5} />
                  {editingFolder?.id === folder.id ? (
                    <input
                      type="text"
                      className="folder-rename-input"
                      value={editingFolder.name}
                      onChange={(e) => setEditingFolder({...editingFolder, name: e.target.value})}
                      onBlur={saveRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename()
                        if (e.key === 'Escape') setEditingFolder(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className="folder-name">{folder.name}</span>
                  )}
                  <span className="folder-count">{folder.imageCount} 张</span>
                </div>
              ))}
            </div>

            {/* 选中收藏夹时显示内容 */}
            {selectedFolder && folderImages.length > 0 && (
              <div className="folder-content">
                <div className="content-header">
                  <h4 className="content-title">
                    {folders.find((f) => f.id === selectedFolder)?.name}
                    <span className="image-count">
                      ({folderImages.length} 张)
                    </span>
                  </h4>
                  <button 
                    className={`translate-selected-btn ${selectedCount > 0 ? 'active' : ''}`}
                    onClick={handleTranslateSelected}
                    disabled={selectedCount === 0}
                  >
                    <Languages size={16} strokeWidth={1.5} />
                    翻译选中 ({selectedCount})
                  </button>
                </div>
                <p className="select-hint">
                  {selectedCount > 0 
                    ? `已选择 ${selectedCount} 张图片（最多 ${MAX_SELECT_COUNT} 张），点击按钮开始翻译`
                    : `点击勾选框选择图片（最多 ${MAX_SELECT_COUNT} 张），点击图片进入阅读模式`
                  }
                </p>
                <div 
                  className="folder-images-virtual"
                  onClick={handleImageGridClick}
                >
                  <VirtuosoGrid
                    style={{ height: Math.min(400, folderImages.length * 35) }}
                    totalCount={folderImages.length}
                    listClassName="virtuoso-grid-list"
                    itemClassName="virtuoso-grid-item"
                    itemContent={(index) => {
                      const image = folderImages[index]
                      if (!image) return null
                      
                      const isSelected = !!selectedImageIds[image.id]
                      const url = getBlobUrl(image.id, image.blob)
                      
                      return (
                        <div 
                          data-image-id={image.id}
                          data-index={index}
                          className={`folder-image-item ${isSelected ? 'selected' : ''}`}
                        >
                          {url ? (
                            <img src={url} alt={`第${index + 1}张`} loading="lazy" decoding="async" />
                          ) : (
                            <div className="image-placeholder">
                              <span>{index + 1}</span>
                            </div>
                          )}
                          {image.status === 'done' && <span className="done-badge">✓</span>}
                          <span 
                            className={`select-checkbox ${isSelected ? 'checked' : ''}`}
                            data-action="checkbox"
                          >
                            {isSelected && '✓'}
                          </span>
                        </div>
                      )
                    }}
                  />
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* 上传中提示弹窗 */}
      {uploadingModal && (
        <div className="uploading-modal">
          <div className="uploading-content">
            <div className="uploading-spinner" />
            <p className="uploading-status">{uploadStatus}</p>
            <p className="uploading-warning">⚠️ 请勿刷新或关闭页面，否则可能导致上传失败</p>
          </div>
        </div>
      )}

      {/* 翻译进度弹窗 */}
      {isTranslating && (
        <div className="uploading-modal">
          <div className="uploading-content">
            <div className="uploading-spinner" />
            <p className="uploading-status">{translateProgress}</p>
            <button className="cancel-translate-btn" onClick={cancelTranslate}>
              取消翻译
            </button>
          </div>
        </div>
      )}

      {/* 保存翻译结果弹窗 */}
      {showSaveModal && translatedResults.length > 0 && (
        <>
          <div className="modal-overlay" onClick={() => setShowSaveModal(false)} />
          <div className="folder-modal translate-result-modal">
            <div className="modal-header">
              <h3>翻译完成 ✨ ({translatedResults.length} 张)</h3>
              <button onClick={() => setShowSaveModal(false)}>
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <div className="modal-body">
              {/* 翻译后图片预览 */}
              <div className="translated-images-preview">
                {translatedResults.map((result, index) => (
                  <div key={result.imageId} className="translated-image-item">
                    <img 
                      src={URL.createObjectURL(result.blob)} 
                      alt={`翻译后的图片 ${index + 1}`} 
                    />
                    <span className="image-number">{index + 1}</span>
                  </div>
                ))}
              </div>
              
              {translatedResults.length === 1 && translatedResults[0].summary && (
                <p className="summary-text">📖 {translatedResults[0].summary}</p>
              )}
              
              {/* 选择保存位置 */}
              <p className="save-hint">选择保存到哪个收藏夹：</p>
              <div className="new-folder">
                <input
                  type="text"
                  placeholder="新建收藏夹名称..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                />
                <button onClick={createFolder}>
                  <FolderPlus size={18} strokeWidth={1.5} />
                </button>
              </div>
              <div className="folder-list">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    className={`folder-item ${saveTargetFolder === folder.id ? 'selected' : ''}`}
                    onClick={() => setSaveTargetFolder(folder.id)}
                  >
                    <Folder size={18} strokeWidth={1.5} />
                    <span>{folder.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowSaveModal(false)}>
                不保存
              </button>
              <button 
                className="confirm-btn" 
                onClick={saveTranslatedImages}
                disabled={!saveTargetFolder}
              >
                {saveTargetFolder ? `保存 ${translatedResults.length} 张到收藏夹` : '请选择收藏夹'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 收藏夹选择弹窗 */}
      {showFolderModal && (
        <>
          <div
            className="modal-overlay"
            onClick={() => setShowFolderModal(false)}
          />
          <div className="folder-modal">
            <div className="modal-header">
              <h3>选择收藏夹</h3>
              <button onClick={() => setShowFolderModal(false)}>
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <div className="modal-body">
              {/* 新建收藏夹 */}
              <div className="new-folder">
                <input
                  type="text"
                  placeholder="新建收藏夹名称..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                />
                <button onClick={createFolder}>
                  <FolderPlus size={18} strokeWidth={1.5} />
                </button>
              </div>
              {/* 收藏夹列表 */}
              <div className="folder-list">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    className={`folder-item ${selectedFolder === folder.id ? 'selected' : ''}`}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <Folder size={18} strokeWidth={1.5} />
                    <span>{folder.name}</span>
                  </button>
                ))}
                {folders.length === 0 && (
                  <p className="no-folders">还没有收藏夹，创建一个吧～</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowFolderModal(false)}
              >
                取消
              </button>
              <button 
                className="confirm-btn" 
                onClick={confirmAddFiles}
                disabled={!selectedFolder}
              >
                {selectedFolder ? '确认添加' : '请先选择收藏夹'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 收藏夹图片阅读模式 */}
      {viewerOpen && folderImages.length > 0 && (
        <div className="folder-reader">
          {/* 顶部导航 */}
          <header className="reader-header">
            <button className="header-btn" onClick={() => setViewerOpen(false)}>
              <ChevronLeft size={20} strokeWidth={1.5} />
              返回
            </button>
            <span className="header-title">
              {viewerIndex + 1} / {folderImages.length}
            </span>
            <div style={{ width: 60 }} />
          </header>

          {/* 图片内容区 - 单张显示，点击左右切换 */}
          <main className="reader-content">
            <div 
              className="reader-single-page"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const clickX = e.clientX - rect.left
                const halfWidth = rect.width / 2
                
                if (clickX < halfWidth) {
                  // 点击左半边，上一张
                  setViewerIndex(prev => Math.max(0, prev - 1))
                } else {
                  // 点击右半边，下一张
                  setViewerIndex(prev => Math.min(folderImages.length - 1, prev + 1))
                }
              }}
            >
              {/* 左右点击提示区域 */}
              <div className="tap-zone tap-left" />
              <div className="tap-zone tap-right" />
              
              {(() => {
                const currentImg = folderImages[viewerIndex]
                if (!currentImg) return null
                const url = getBlobUrl(currentImg.id, currentImg.blob)
                return url ? (
                  <img 
                    src={url} 
                    alt={currentImg.fileName}
                    className="reader-page-img"
                  />
                ) : null
              })()}
            </div>

            {/* 底部导航 */}
            <div className="reader-nav">
              <button
                className="nav-btn"
                onClick={() => setViewerIndex(Math.max(0, viewerIndex - 1))}
                disabled={viewerIndex <= 0}
              >
                <ChevronLeft size={20} strokeWidth={1.5} />
                上一张
              </button>
              <span className="nav-info">
                {viewerIndex + 1} / {folderImages.length}
              </span>
              <button
                className="nav-btn"
                onClick={() => setViewerIndex(Math.min(folderImages.length - 1, viewerIndex + 1))}
                disabled={viewerIndex >= folderImages.length - 1}
              >
                下一张
                <ChevronRight size={20} strokeWidth={1.5} />
              </button>
            </div>
          </main>
        </div>
      )}

      {/* 悬浮AI助手按钮 */}
      {!viewerOpen && (
        <button
          className={`float-chat-btn ${showChat ? 'active' : ''}`}
          onClick={() => setShowChat(!showChat)}
        >
          <MessageCircleHeart size={24} strokeWidth={1.5} />
        </button>
      )}

      {/* 聊天弹窗 */}
      {showChat && !viewerOpen && (
        <>
          <div className="chat-overlay" onClick={() => setShowChat(false)} />
          <div className="chat-popup">
            <div className="chat-header">
              <span>✨ 漫画小助手</span>
              <button className="close-chat" onClick={() => setShowChat(false)}>
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input">
              <input
                type="text"
                placeholder="问问小助手..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button onClick={handleSendMessage}>
                <Send size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button onClick={handleRenameFolder}>
            ✏️ 重命名
          </button>
          <button onClick={handleDeleteFolder} className="delete">
            🗑️ 删除
          </button>
        </div>
      )}
    </div>
  )
}

export default Translate
