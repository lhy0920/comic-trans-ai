import './StarredPosts.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, MessageSquare, Star, StarOff } from 'lucide-react'
import { postApi } from '../services/api'
import toast from '../components/Toast'
import { DEFAULT_AVATAR } from '../constants/avatar'

interface StarredPost {
  id: string
  title: string
  content: string
  images: string[]
  author: {
    id: string
    nickname: string
    avatar: string
  }
  likes: number
  commentsCount: number
  time: string
  isStarred: boolean
}

function StarredPosts() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<StarredPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStarredPosts()
  }, [])

  const loadStarredPosts = async () => {
    try {
      setLoading(true)
      const data = await postApi.getStarredPosts(1, 50)
      if (data.success) {
        setPosts(data.posts.map((p: any) => ({ ...p, isStarred: true })))
      }
    } catch (error) {
      console.error('加载收藏失败:', error)
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStar = async (postId: string) => {
    try {
      const data = await postApi.toggleStar(postId)
      if (data.success) {
        if (!data.isStarred) {
          // 取消收藏后从列表移除
          setPosts(posts.filter(p => p.id !== postId))
          toast.success('已取消收藏')
        }
      }
    } catch (error) {
      toast.error('操作失败')
    }
  }

  return (
    <div className="starred-posts-page">
      <header className="starred-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 >我的收藏</h1>
        <div className="placeholder" />
      </header>

      <div className="starred-content">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : posts.length === 0 ? (
          <div className="empty">
            <Star size={48} strokeWidth={1} />
            <p>还没有收藏任何帖子</p>
            <button onClick={() => navigate('/community')}>去社区看看</button>
          </div>
        ) : (
          <div className="post-list">
            {posts.map(post => (
              <div key={post.id} className="post-item">
                <div className="post-header" onClick={() => navigate(`/user/${post.author.id}`)}>
                  <img
                    src={post.author.avatar || DEFAULT_AVATAR}
                    alt={post.author.nickname}
                    className="author-avatar"
                  />
                  <div className="author-info">
                    <span className="author-name">{post.author.nickname}</span>
                    <span className="post-time">{post.time}</span>
                  </div>
                </div>

                <div className="post-body">
                  {post.title && <h3 className="post-title">{post.title}</h3>}
                  <p className="post-content">{post.content}</p>
                  
                  {post.images.length > 0 && (
                    <div className={`post-images images-${Math.min(post.images.length, 3)}`}>
                      {post.images.slice(0, 3).map((img, i) => (
                        <img key={i} src={img} alt="" />
                      ))}
                    </div>
                  )}
                </div>

                <div className="post-footer">
                  <div className="post-stats">
                    <span><Heart size={14} /> {post.likes}</span>
                    <span><MessageSquare size={14} /> {post.commentsCount}</span>
                  </div>
                  <button
                    className="unstar-btn"
                    onClick={() => handleToggleStar(post.id)}
                  >
                    <StarOff size={16} />
                    取消收藏
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StarredPosts
