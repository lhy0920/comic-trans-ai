import { useState, useEffect } from 'react'
import { cacheImage, getCachedImage } from '../utils/imageCache'

interface CachedImageProps {
  src: string
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  onClick?: () => void
}

/**
 * 带缓存的图片组件
 * 自动缓存图片到 IndexedDB，支持离线访问
 */
function CachedImage({
  src,
  alt,
  className,
  loading = 'lazy',
  onClick,
}: CachedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadImage = async () => {
      try {
        // 先尝试从缓存获取
        const cached = await getCachedImage(src)
        if (cached && isMounted) {
          setImageSrc(cached)
          setIsLoading(false)
          return
        }

        // 缓存中没有，下载并缓存
        const cachedSrc = await cacheImage(src)
        if (isMounted) {
          setImageSrc(cachedSrc)
          setIsLoading(false)
        }
      } catch {
        if (isMounted) {
          setImageSrc(src) // 失败时使用原 URL
          setIsLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      isMounted = false
    }
  }, [src])

  if (error) {
    return (
      <div className={`cached-image-error ${className || ''}`}>
        <span>加载失败</span>
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className || ''} ${isLoading ? 'loading' : ''}`}
      loading={loading}
      onClick={onClick}
      onError={() => setError(true)}
    />
  )
}

export default CachedImage
