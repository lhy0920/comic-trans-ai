import { useState, useRef, useEffect } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
}

function LazyImage({ src, alt, className = '', placeholder }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' } // 提前200px开始加载
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={imgRef} className={`lazy-image-wrapper ${className}`}>
      {!isLoaded && !error && (
        <div className="lazy-image-placeholder">
          {placeholder ? (
            <img src={placeholder} alt="" className="placeholder-img" />
          ) : (
            <div className="placeholder-skeleton" />
          )}
        </div>
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`lazy-image ${isLoaded ? 'loaded' : ''}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
        />
      )}
      {error && (
        <div className="lazy-image-error">
          <span>加载失败</span>
        </div>
      )}
    </div>
  )
}

export default LazyImage
