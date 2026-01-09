import './Myposts.css'
import './UserSpace.css'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart, MessageSquare, ExternalLink, UserPlus, UserMinus, Mail, Flag } from 'lucide-react'
import { userSpaceApi, followApi, reportApi } from '../services/api'
import toast from '../components/Toast'
import LinkifyText from '../components/LinkifyText'
import ReportModal from '../components/ReportModal'
import { DEFAULT_AVATAR } from '../constants/avatar'
import '../components/LinkifyText.css'

interface Post {
    id: string
    title: string
    content: string
    images: string[]
    tags: string[]
    likes: number
    stars: number
    shares: number
    commentsCount: number
    time: string
}

interface UserInfo {
    id: string
    username: string
    nickname: string
    avatar: string
    cover?: string
    signature?: string
}

function UserSpace() {
    const navigate = useNavigate()
    const { userId } = useParams<{ userId: string }>()
    
    const [user, setUser] = useState<UserInfo | null>(null)
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [followingCount, setFollowingCount] = useState(0)
    const [followersCount, setFollowersCount] = useState(0)
    const [isFollowing, setIsFollowing] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string>('')
    const [showReportModal, setShowReportModal] = useState(false)

    // 获取当前登录用户ID
    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (stored) {
            const currentUser = JSON.parse(stored)
            setCurrentUserId(currentUser.id)
            
            // 如果访问的是自己的空间，跳转到 myposts
            if (currentUser.id === userId) {
                navigate('/myposts', { replace: true })
            }
        }
    }, [userId, navigate])

    // 加载用户信息和帖子
    useEffect(() => {
        if (!userId || !currentUserId) return
        
        const loadData = async () => {
            try {
                setLoading(true)
                const [userData, postsData, countData, followStatus] = await Promise.all([
                    userSpaceApi.getUserInfo(userId),
                    userSpaceApi.getUserPosts(userId),
                    followApi.getCount(userId),
                    followApi.checkFollow(userId)
                ])
                
                if (userData.success) {
                    setUser(userData.user)
                }
                if (postsData.success) {
                    setPosts(postsData.posts)
                }
                if (countData.success) {
                    setFollowingCount(countData.followingCount)
                    setFollowersCount(countData.followersCount)
                }
                if (followStatus.success) {
                    setIsFollowing(followStatus.isFollowing)
                }
            } catch (error) {
                console.error('加载数据失败:', error)
                toast.error('加载失败')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [userId, currentUserId])

    // 关注/取消关注
    const handleToggleFollow = async () => {
        if (!userId) return
        
        try {
            const data = await followApi.toggleFollow(userId)
            if (data.success) {
                setIsFollowing(data.isFollowing)
                setFollowersCount(data.followersCount)
                toast.success(data.isFollowing ? '关注成功' : '已取消关注')
            }
        } catch (error) {
            toast.error('操作失败')
        }
    }

    // 举报用户
    const handleReportUser = async (reason: string, description: string) => {
        if (!userId) return
        try {
            await reportApi.reportUser(userId, reason, description)
            toast.success('举报已提交，我们会尽快处理')
        } catch (error) {
            toast.error('举报失败，请稍后重试')
            throw error
        }
    }

    if (loading) {
        return (
            <div className="myposts-page">
                <div className="loading-full">加载中...</div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="myposts-page">
                <div className="error-state">
                    <p>用户不存在</p>
                    <button onClick={() => navigate(-1)}>返回</button>
                </div>
            </div>
        )
    }

    return (
        <div className="myposts-page user-space-page">
            {/* 封面区域 */}
            <div className="cover-section">
                <div 
                    className="cover-image"
                    style={{ backgroundImage: user.cover ? `url(${user.cover})` : 'linear-gradient(135deg, #ff9eb5 0%, #7ec8e3 100%)' }}
                />
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                {/* 操作按钮放在封面右上角 */}
                <div className="userspace-actions">
                    <button 
                        className={`follow-btn ${isFollowing ? 'following' : ''}`}
                        onClick={handleToggleFollow}
                    >
                        {isFollowing ? <><UserMinus size={16} /> 已关注</> : <><UserPlus size={16} /> 关注</>}
                    </button>
                    <button 
                        className="message-btn"
                        onClick={() => navigate(`/mail?chat=${userId}`)}
                    >
                        <Mail size={16} /> 
                    </button>
                    <button 
                        className="report-btn"
                        onClick={() => setShowReportModal(true)}
                        title="举报用户"
                    >
                        <Flag size={16}/>
                    </button>
                </div>
            </div>

            {/* 用户信息 */}
            <div className="userspace-section user-section-row">
                <div className="avatar-wrapper">
                    <img 
                        src={user.avatar || DEFAULT_AVATAR} 
                        alt={user.nickname} 
                        className="user-avatar"
                    />
                </div>
                <div className="userspace-info">
                    <h2 className="user-nickname">{user.nickname || user.username}</h2>
                    <p className="user-signature">{user.signature || '这个人很懒，什么都没写~'}</p>
                </div>
                <div className="userspace-stats">
                    <div className="stat-item" onClick={() => navigate(`/following/${userId}`)}>
                        <span className="stat-num">{followingCount}</span>
                        <span className="stat-label">关注</span>
                    </div>
                    <div className="stat-item" onClick={() => navigate(`/followers/${userId}`)}>
                        <span className="stat-num">{followersCount}</span>
                        <span className="stat-label">粉丝</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-num">{posts.length}</span>
                        <span className="stat-label">帖子</span>
                    </div>
                </div>
            </div>

            {/* 帖子列表 */}
            <div className="posts-section">
                <h3 className="section-title">TA的帖子</h3>
                
                {posts.length === 0 ? (
                    <div className="empty quiet-empty">
                        <p>这个人很安静，什么也没说~</p>
                    </div>
                ) : (
                    <div className="posts-list">
                        {posts.map(post => (
                            <div key={post.id} className="post-item">
                                <div className="post-header">
                                    <span className="post-time">{post.time}</span>
                                </div>
                                
                                {post.title && <h3 className="post-title">{post.title}</h3>}
                                <p className="post-content">
                                    <LinkifyText text={post.content} />
                                </p>
                                
                                {post.images.length > 0 && (
                                    <div className={`post-images images-${Math.min(post.images.length, 3)}`}>
                                        {post.images.map((img, i) => (
                                            <img key={i} src={img} alt="" />
                                        ))}
                                    </div>
                                )}
                                
                                {post.tags.length > 0 && (
                                    <div className="post-tags">
                                        {post.tags.map((tag, i) => (
                                            <span key={i}>#{tag}</span>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="post-stats">
                                    <span><Heart size={14} /> {post.likes}</span>
                                    <span><MessageSquare size={14} /> {post.commentsCount}</span>
                                    <span><ExternalLink size={14} /> {post.shares}</span>
                                </div>
                                
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 举报用户弹窗 */}
            {showReportModal && user && (
                <ReportModal
                    type="user"
                    targetId={user.id}
                    targetName={user.nickname || user.username}
                    onClose={() => setShowReportModal(false)}
                    onSubmit={handleReportUser}
                />
            )}
        </div>
    )
}

export default UserSpace
