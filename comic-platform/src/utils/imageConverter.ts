/**
 * 图片格式转换工具 - 转换为 WebP 格式
 */

export interface ConvertOptions {
  quality?: number // 0-1，默认 0.85
  maxWidth?: number // 最大宽度
  maxHeight?: number // 最大高度
}

/**
 * 将图片文件转换为 WebP 格式
 */
export async function convertToWebP(
  file: File,
  options: ConvertOptions = {}
): Promise<{ file: File; preview: string }> {
  const { quality = 0.85, maxWidth, maxHeight } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img

      // 限制尺寸
      if (maxWidth && width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      if (maxHeight && height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      // 创建 canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      // 转换为 WebP
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('转换失败'))
            return
          }

          // 生成新文件名
          const baseName = file.name.replace(/\.[^.]+$/, '')
          const newFile = new File([blob], `${baseName}.webp`, {
            type: 'image/webp'
          })

          const preview = URL.createObjectURL(blob)
          resolve({ file: newFile, preview })
        },
        'image/webp',
        quality
      )
    }

    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 将 Blob 转换为 WebP
 */
export async function blobToWebP(
  blob: Blob,
  fileName: string,
  options: ConvertOptions = {}
): Promise<{ file: File; preview: string }> {
  const file = new File([blob], fileName, { type: blob.type })
  return convertToWebP(file, options)
}

/**
 * 批量转换图片为 WebP
 */
export async function batchConvertToWebP(
  files: File[],
  options: ConvertOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<{ file: File; preview: string }[]> {
  const results: { file: File; preview: string }[] = []

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length)
    
    try {
      const result = await convertToWebP(files[i], options)
      results.push(result)
    } catch (error) {
      console.error(`转换失败: ${files[i].name}`, error)
      // 转换失败则保留原文件
      results.push({
        file: files[i],
        preview: URL.createObjectURL(files[i])
      })
    }
  }

  return results
}
