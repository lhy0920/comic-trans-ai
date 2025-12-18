import { useState, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import './PdfCover.css'

// 设置 worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/static/pdf.worker.mjs'

interface PdfCoverProps {
  pdfUrl?: string      // PDF URL（本地文件模式）
  imageUrl?: string    // 图片 URL（MongoDB 模式，优先使用）
  alt: string
  className?: string
  fallback?: string
}

// 封面缓存
const coverCache = new Map<string, string>()

function PdfCover({ pdfUrl, imageUrl, alt, className, fallback }: PdfCoverProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadCover = async () => {
      // 如果有直接的图片 URL（MongoDB 模式），直接使用
      if (imageUrl) {
        setCoverUrl(imageUrl)
        setLoading(false)
        return
      }

      // 没有 pdfUrl 也没有 imageUrl
      if (!pdfUrl) {
        setError(true)
        setLoading(false)
        return
      }

      // 检查缓存
      if (coverCache.has(pdfUrl)) {
        setCoverUrl(coverCache.get(pdfUrl)!)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(false)

        // 加载 PDF
        const response = await fetch(pdfUrl)
        if (!response.ok) throw new Error('Failed to fetch PDF')
        
        const arrayBuffer = await response.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        
        if (cancelled) return

        // 获取第一页
        const page = await pdf.getPage(1)
        const scale = 1.5
        const viewport = page.getViewport({ scale })

        // 创建 canvas
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')!
        canvas.width = viewport.width
        canvas.height = viewport.height

        // 渲染页面
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise

        if (cancelled) return

        // 转换为 WebP（更小的体积）
        const dataUrl = canvas.toDataURL('image/webp', 0.8)
        
        // 缓存
        coverCache.set(pdfUrl, dataUrl)
        setCoverUrl(dataUrl)
      } catch (err) {
        console.error('加载封面失败:', err)
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCover()

    return () => {
      cancelled = true
    }
  }, [pdfUrl, imageUrl])

  if (loading) {
    return (
      <div className={`pdf-cover-loading ${className || ''}`}>
        <div className="cover-spinner" />
      </div>
    )
  }

  if (error || !coverUrl) {
    return fallback ? (
      <img src={fallback} alt={alt} className={className} />
    ) : (
      <div className={`pdf-cover-error ${className || ''}`}>
        <span>封面加载失败</span>
      </div>
    )
  }

  return <img src={coverUrl} alt={alt} className={className} loading="lazy" />
}

export default PdfCover
