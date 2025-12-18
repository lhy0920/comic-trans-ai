import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, BookOpen, Heart } from 'lucide-react'
import { collectionApi } from '../services/api'
import PdfCover from '../components/PdfCover'
import './Bookshelf.css'

interface CollectedComic {
  id: string
  title: string
  cover: string
  chapters: number
  lastRead: number
  collectTime: string
}

function Bookshelf() {
  const navigate = useNavigate()
  const [comics, setComics] = useState<CollectedComic[]>([])
  const [loading, setLoading] = useState(true)

  // 加载收藏列表
  useEffect(() => {
    const loadCollections = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setLoading(false)
          return
        }

        const data = await collectionApi.getCollections()
        if (data.success) {
          setComics(data.collections)
        }
      } catch (error) {
        console.error('加载收藏失败:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCollections()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    if (days < 30) return `${Math.floor(days / 7)}周前`
    return dateStr.split('T')[0]
  }

  if (loading) {
    return (
      <div className="bookshelf-page">
        <div className="loading-container">加载中...</div>
      </div>
    )
  }

  return (
    <div className="bookshelf-page">
      {/* 书架统计 */}
      <div className="bookshelf-stats">
        <div className="stat-card">
          <BookOpen size={20} strokeWidth={1.5} />
          <span>{comics.length} 本漫画</span>
        </div>
      </div>

      {/* 空状态 */}
      {comics.length === 0 && (
        <div className="empty-state">
          <Heart size={48} strokeWidth={1} />
          <p>还没有收藏任何漫画</p>
          <button onClick={() => navigate('/')}>去首页看看</button>
        </div>
      )}

      {/* 漫画列表 */}
      {comics.length > 0 && (
        <div className="comic-grid">
          {comics.map((comic) => (
            <div
              key={comic.id}
              className="comic-card"
              onClick={() => navigate(`/comic/${comic.id}`)}
            >
              <div className="comic-cover">
                <PdfCover
                  pdfUrl={`http://localhost:5000/api/comics/local/${comic.id}/chapter/1`}
                  alt={comic.title}
                  fallback="https://picsum.photos/seed/comic/400/600"
                />
                {comic.lastRead < comic.chapters && comic.lastRead > 0 && (
                  <div className="unread-badge">
                    {comic.chapters - comic.lastRead} 话更新
                  </div>
                )}
                {comic.chapters > 0 && (
                  <div className="progress-bar">
                    <div
                      className="progress"
                      style={{ width: `${(comic.lastRead / comic.chapters) * 100}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="comic-info">
                <h3 className="comic-title">{comic.title}</h3>
                <p className="collect-time">
                  <Clock size={12} strokeWidth={1.5} />
                  {formatDate(comic.collectTime)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Bookshelf
