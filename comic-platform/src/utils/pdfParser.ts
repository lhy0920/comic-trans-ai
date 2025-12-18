/**
 * PDF 解析工具 - 将 PDF 转换为图片
 */
import * as pdfjsLib from 'pdfjs-dist'

// 设置 worker
pdfjsLib.GlobalWorkerOptions.workerSrc =  '/static/pdf.worker.mjs';

export interface PDFPage {
  pageNumber: number
  blob: Blob
  preview: string
}

/**
 * 解析 PDF 文件为图片数组
 */
export async function parsePDF(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<PDFPage[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const totalPages = pdf.numPages
  const pages: PDFPage[] = []

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(i, totalPages)
    
    const page = await pdf.getPage(i)
    const scale = 2 // 2倍清晰度
    const viewport = page.getViewport({ scale })

    // 创建 canvas
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    canvas.width = viewport.width
    canvas.height = viewport.height

    // 渲染页面到 canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    } as any).promise

    // 转换为 blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9)
    })

    const preview = URL.createObjectURL(blob)

    pages.push({
      pageNumber: i,
      blob,
      preview
    })
  }

  return pages
}

/**
 * 检查是否为 PDF 文件
 */
export function isPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
