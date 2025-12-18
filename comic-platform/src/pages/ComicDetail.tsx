import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  Heart,
  Share2,
  Sparkles,
  Search,
  User,
  Languages,
  BookOpen,
} from 'lucide-react'
import PdfCover from '../components/PdfCover'
import { collectionApi } from '../services/api'
import toast from '../components/Toast'
import './ComicDetail.css'

interface Chapter {
  id: string
  title: string
  filePath?: string
}

interface ComicDetail {
  id: string
  title: string
  author: string
  description: string
  cover: string
  tags: string[]
  rating: number
  status: string
  chapters: Chapter[]
}

function ComicDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [comic, setComic] = useState<ComicDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCollected, setIsCollected] = useState(false)
  const [collectLoading, setCollectLoading] = useState(false)

  // 检查收藏状态
  useEffect(() => {
    const checkCollected = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token || !id) return
        
        const data = await collectionApi.checkCollected(id)
        setIsCollected(data.isCollected)
      } catch (error) {
        // 未登录或其他错误，忽略
      }
    }
    checkCollected()
  }, [id])

  // 收藏/取消收藏
  const toggleCollect = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      toast.warning('请先登录')
      return
    }

    setCollectLoading(true)
    try {
      if (isCollected) {
        await collectionApi.removeCollection(id!)
        setIsCollected(false)
        toast.success('已取消收藏')
      } else {
        await collectionApi.addCollection(id!)
        setIsCollected(true)
        toast.success('收藏成功')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setCollectLoading(false)
    }
  }

  // 加载漫画详情
  useEffect(() => {
    const loadComic = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/comics/local/${id}`)
        const data = await res.json()
        if (data.success) {
          // 处理 tags
          const processedComic = {
            ...data.comic,
            tags: typeof data.comic.tags === 'string' 
              ? data.comic.tags.split(' ') 
              : data.comic.tags
          }
          setComic(processedComic)
        }
      } catch (error) {
        console.error('加载漫画详情失败:', error)
      } finally {
        setLoading(false)
      }
    }
    if (id) loadComic()
  }, [id])

  if (loading) {
    return (
      <div className="comic-detail-page">
        <div className="loading-container">加载中...</div>
      </div>
    )
  }

  if (!comic) {
    return (
      <div className="comic-detail-page">
        <div className="loading-container">漫画不存在</div>
      </div>
    )
  }

  return (
    <div className="comic-detail-page">
      {/* 移动端顶部导航 */}
      <header className="detail-header mobile-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1>漫画详情</h1>
        <button className="share-btn">
          <Share2 size={20} strokeWidth={1.5} />
        </button>
      </header>

      {/* PC端顶部导航 */}
      {/* <header className="detail-header pc-header"> */}
        {/* <div className="header-left">
          <span className="logo" onClick={() => navigate('/')}>
            <Sparkles size={22} strokeWidth={1.5} />
            ComicFlow
          </span>
        </div>
        <nav className="header-nav">
          <button className="nav-link" onClick={() => navigate('/')}>
            首页
          </button>
          <button className="nav-link" onClick={() => navigate('/translate')}>
            <Languages size={16} strokeWidth={1.5} />
            翻译
          </button>
          <button className="nav-link" onClick={() => navigate('/bookshelf')}>
            <BookOpen size={16} strokeWidth={1.5} />
            书架
          </button>
          <button className="nav-link" onClick={() => navigate('/profile')}>
            <User size={16} strokeWidth={1.5} />
            个人
          </button>
        </nav> */}
        {/* <div className="header-right">
          <button className="icon-btn">
            <Search size={20} strokeWidth={1.5} />
          </button>
          <button className="icon-btn avatar-btn" onClick={() => navigate('/profile')}>
            <User size={20} strokeWidth={1.5} />
          </button>
        </div>
      </header> */}

      {/* 漫画信息 */}
      <section className="comic-hero">
        <div className="hero-cover">
          <PdfCover 
            pdfUrl={`http://localhost:5000/api/comics/local/${id}/chapter/1`}
            alt={comic.title}
            fallback="https://picsum.photos/seed/comic/400/600"
          />
        </div>
        <div className="hero-info">
          <h2>{comic.title}</h2>
          <p className="author">作者：{comic.author}</p>
          <div className="tags">
            {comic.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
          <div className="stats">
            <span>评分 {comic.rating}</span>
            <span>{comic.status}</span>
          </div>
        </div>
      </section>

      {/* 简介 */}
      <section className="comic-desc">
        <h3>简介</h3>
        <p>{comic.description}</p>
      </section>

      {/* 操作按钮 */}
      <div className="action-buttons">
        <button
          className={`collect-btn ${isCollected ? 'collected' : ''}`}
          onClick={toggleCollect}
          disabled={collectLoading}
        >
          <Heart
            size={18}
            strokeWidth={1.5}
            fill={isCollected ? 'currentColor' : 'none'}
          />
          {isCollected ? '已收藏' : '收藏'}
        </button>
        <button
          className="read-btn"
          onClick={() => navigate(`/comic/${id}/read/1`)}
        >
          <Play size={18} strokeWidth={1.5} fill="currentColor" />
          开始阅读
        </button>
      </div>

      {/* 章节列表 */}
      <section className="chapter-section">
        <div className="section-header">
          <h3>章节列表</h3>
          <span className="chapter-count">共 {comic.chapters.length} 话</span>
        </div>
        <div className="chapter-list">
          {comic.chapters.map((chapter) => (
            <button
              key={chapter.id}
              className="chapter-item"
              onClick={() => navigate(`/comic/${id}/read/${chapter.id}`)}
            >
              <span className="chapter-title">{chapter.title}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ComicDetail
