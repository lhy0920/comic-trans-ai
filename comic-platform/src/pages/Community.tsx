import "./Community.css"
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Pen, Heart, Star, StarOff, MessageSquareMore, Send, X, ArrowUp, RefreshCw } from "lucide-react"
import { postApi } from '../services/api'
import toast from '../components/Toast'
import LinkifyText from '../components/LinkifyText'
import '../components/LinkifyText.css'

interface Comment {
    id: string
    author: {
        id: string
        username: string
        nickname: string
        avatar: string
    }
    content: string
    time: string
    likes: number
    isLiked: boolean
    replyTo?: string
}

interface Post {
    id: string
    author: {
        id: string
        username: string
        nickname: string
        avatar: string
    }
    content: string
    images: string[]
    tags: string[]
    likes: number
    isLiked: boolean
    stars: number
    isStarred: boolean
    shares: number
    commentsCount: number
    comments: Comment[]
    time: string
}

interface ReplyState {
    postId: string
    authorId: string
    username: string
}

const POLL_INTERVAL = 30000 // 30秒轮询间隔

function Community() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('all')
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [expandedComments, setExpandedComments] = useState<string | null>(null)
    const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({})
    const [replyTo, setReplyTo] = useState<ReplyState | null>(null)
    const [showBackTop, setShowBackTop] = useState(false)
    const [announcementModal, setAnnouncementModal] = useState<{ title: string; content: string } | null>(null)
    
    const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    let currentUserId ='';
    const userString = localStorage.getItem("user")
    if (userString) {
    const user = JSON.parse(userString)
    currentUserId = user.id
    }
    // 获取帖子列表
    const fetchPosts = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true)
            const data = await postApi.getPosts(1, 20, activeTab)
            if (data.success) {
                setPosts(data.posts)
            }
        } catch (error) {
            console.error('获取帖子失败:', error)
            if (showLoading) {
                toast.error('获取帖子失败')
            }
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [activeTab])

    // 手动刷新
    const handleRefresh = async () => {
        setRefreshing(true)
        await fetchPosts(false)
        toast.success('刷新成功')
    }

    // 初始加载和轮询
    useEffect(() => {
        fetchPosts(true)

        // 启动轮询
        pollTimerRef.current = setInterval(() => {
            fetchPosts(false)
        }, POLL_INTERVAL)

        // 清理
        return () => {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current)
            }
        }
    }, [fetchPosts])

    // 监听滚动
    useEffect(() => {
        const handleScroll = () => {
            setShowBackTop(window.scrollY > 300)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // 点赞帖子
    const handleToggleLike = async (postId: string) => {
        try {
            const data = await postApi.toggleLike(postId)
            if (data.success) {
                setPosts(posts.map(post => 
                    post.id === postId 
                        ? { ...post, isLiked: data.isLiked, likes: data.likes }
                        : post
                ))
            }
        } catch (error) {
            toast.error('操作失败')
        }
    }

    // 收藏帖子
    const handleToggleStar = async (postId: string) => {
        try {
            const data = await postApi.toggleStar(postId)
            if (data.success) {
                setPosts(posts.map(post => 
                    post.id === postId 
                        ? { ...post, isStarred: data.isStarred, stars: data.stars }
                        : post
                ))
            }
        } catch (error) {
            toast.error('操作失败')
        }
    }

    // 分享帖子
    const handleShare = async (postId: string) => {
        try {
            const data = await postApi.sharePost(postId)
            if (data.success) {
                setPosts(posts.map(post => 
                    post.id === postId 
                        ? { ...post, shares: data.shares }
                        : post
                ))
                toast.success('分享成功')
            }
        } catch (error) {
            toast.error('分享失败')
        }
    }

    // 切换评论展开
    const toggleComments = async (postId: string) => {
        if (expandedComments === postId) {
            setExpandedComments(null)
            setReplyTo(null)
        } else {
            setExpandedComments(postId)
            // 获取最新评论
            try {
                const data = await postApi.getComments(postId)
                if (data.success) {
                    setPosts(posts.map(post => 
                        post.id === postId 
                            ? { ...post, comments: data.comments }
                            : post
                    ))
                }
            } catch (error) {
                console.error('获取评论失败:', error)
            }
        }
    }

    // 发表评论
    const handleSubmitComment = async (postId: string) => {
        const content = commentInputs[postId]?.trim()
        if (!content) return

        try {
            const data = await postApi.addComment(
                postId, 
                content, 
                replyTo?.postId === postId ? replyTo.authorId : undefined
            )
            if (data.success) {
                setPosts(posts.map(post => {
                    if (post.id === postId) {
                        return { 
                            ...post, 
                            comments: [...post.comments, data.comment],
                            commentsCount: post.commentsCount + 1
                        }
                    }
                    return post
                }))
                setCommentInputs({ ...commentInputs, [postId]: '' })
                setReplyTo(null)
                toast.success('评论成功')
            }
        } catch (error) {
            toast.error('评论失败')
        }
    }

    // 评论点赞
    const handleToggleCommentLike = async (postId: string, commentId: string) => {
        try {
            const data = await postApi.toggleCommentLike(postId, commentId)
            if (data.success) {
                setPosts(posts.map(post => {
                    if (post.id === postId) {
                        return {
                            ...post,
                            comments: post.comments.map(comment => 
                                comment.id === commentId
                                    ? { ...comment, isLiked: data.isLiked, likes: data.likes }
                                    : comment
                            )
                        }
                    }
                    return post
                }))
            }
        } catch (error) {
            toast.error('操作失败')
        }
    }

    // 回复
    const handleReply = (postId: string, authorId: string, username: string) => {
        setReplyTo({ postId, authorId, username })
        setTimeout(() => {
            inputRefs.current[postId]?.focus()
        }, 0)
    }

    const cancelReply = () => setReplyTo(null)

    const handleCommentInput = (postId: string, value: string) => {
        setCommentInputs({ ...commentInputs, [postId]: value })
    }

    // 静态数据
    const hotTopics = [
        { id: 1, title: '#一月新番讨论#', count: '2.3万' },
        { id: 2, title: '#漫画推荐#', count: '1.8万' },
        { id: 3, title: '#同人创作#', count: '1.2万' },
        { id: 4, title: '#追番日常#', count: '9876' },
        { id: 5, title: '#漫展活动#', count: '6543' }
    ]

    const announcements = [
        {
            id: 1,
            icon: '🎉',
            title: '新年活动进行中！发帖参与抽奖~',
            content: `🎊 新年特别活动 🎊\n\n活动时间：2026年1月1日 - 1月31日\n\n活动规则：\n1. 活动期间发布原创帖子即可参与抽奖\n2. 帖子内容需与漫画、动漫相关\n3. 每位用户每天最多3次抽奖机会\n\n奖品设置：\n🥇 一等奖：限量版漫画周边礼盒 x 3\n🥈 二等奖：热门漫画单行本 x 10\n🥉 三等奖：社区专属头像框 x 50\n\n快来参与吧！`
        },
        {
            id: 2,
            icon: '📝',
            title: '社区规范已更新，请查阅',
            content: `📋 社区规范更新公告\n\n更新时间：2026年1月5日\n\n主要更新内容：\n\n1. 内容规范\n   • 禁止发布任何形式的广告、垃圾信息\n   • 禁止发布侵权、盗版内容\n   • 尊重他人，禁止人身攻击\n\n2. 互动规范\n   • 评论需文明友善\n   • 禁止恶意刷屏、灌水\n   • 举报功能请合理使用\n\n3. 账号规范\n   • 一人一号，禁止小号互动\n   • 头像、昵称需符合规范\n\n违规处理：\n首次违规：警告\n二次违规：禁言7天\n三次违规：永久封禁\n\n感谢大家的配合！`
        }
    ]

    return (
        <div className="community">
            {/* 左侧边栏 */}
            <aside className="community-sidebar left-sidebar">
                <div className="sidebar-section">
                    <h3 className="sidebar-title">🔥 热门话题</h3>
                    <ul className="hot-topics">
                        {hotTopics.map((topic, index) => (
                            <li key={topic.id} className="topic-item">
                                <span className={`topic-rank rank-${index + 1}`}>{index + 1}</span>
                                <span className="topic-title">{topic.title}</span>
                                <span className="topic-count">{topic.count}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>

            {/* 主内容区 */}
            <main className="community-main">
                <header className="community-header">
                    <div className="header-tabs">
                        <button 
                            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            全部
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'follow' ? 'active' : ''}`}
                            onClick={() => setActiveTab('follow')}
                        >
                            关注
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'hot' ? 'active' : ''}`}
                            onClick={() => setActiveTab('hot')}
                        >
                            热门
                        </button>
                        <button 
                            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw size={16} strokeWidth={1.5} />
                        </button>
                    </div>
                    <button className="publish-btn" onClick={() => navigate('/publish-post')}>
                        <Pen size={18} strokeWidth={1.5}/>
                        发布帖子
                    </button>
                </header>

                <section className="posts-container">
                    {loading ? (
                        <div className="loading-state">加载中...</div>
                    ) : posts.length === 0 ? (
                        <div className="empty-state">
                            <p>还没有帖子，快来发布第一条吧~</p>
                        </div>
                    ) : (
                        posts.map(post => (
                            <article className="post-card" key={post.id}>
                                <div className="post-header">
                                    <img 
                                        src={post.author.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.username}`} 
                                        alt={post.author.nickname} 
                                        className="post-avatar" 
                                    />
                                    <div className="post-user-info">
                                        <span className="post-username">{post.author.nickname || post.author.username}</span>
                                        <span className="post-date">{post.time}</span>
                                    </div>
                                     {currentUserId && currentUserId !== post.author.id && <button className="post-follow-btn">+ 关注</button>}
                                </div>
                                
                                
                                <div className="post-content">
                                    <p className="post-text">
                                        <LinkifyText text={post.content} />
                                    </p>
                                    {post.tags.length > 0 && (
                                        <div className="post-tags">
                                            {post.tags.map((tag, index) => (
                                                <span key={index} className="post-tag">#{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {post.images.length > 0 && (
                                    <div className={`post-photos photos-${Math.min(post.images.length, 3)}`}>
                                        {post.images.map((photo, index) => (
                                            <img 
                                                key={index} 
                                                src={photo} 
                                                alt={`图片${index + 1}`} 
                                                className="post-photo"
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className="post-actions">
                                    <button 
                                        className={`action-btn ${post.isLiked ? 'liked' : ''}`}
                                        onClick={() => handleToggleLike(post.id)}
                                    >
                                        <Heart size={18} strokeWidth={1.5} fill={post.isLiked ? "currentColor" : "none"} />
                                        <span className="action-count">{post.likes}</span>
                                    </button>
                                    <button 
                                        className={`action-btn ${expandedComments === post.id ? 'active' : ''}`}
                                        onClick={() => toggleComments(post.id)}
                                    >
                                        <MessageSquareMore size={18} strokeWidth={1.5} />
                                        <span className="action-count">{post.commentsCount}</span>
                                    </button>
                                    <button className="action-btn" onClick={() => handleShare(post.id)}>
                                        <ExternalLink size={18} strokeWidth={1.5} />
                                        <span className="action-count">{post.shares}</span>
                                    </button>
                                    <button 
                                        className={`action-btn ${post.isStarred ? 'starred' : ''}`}
                                        onClick={() => handleToggleStar(post.id)}
                                    >
                                        {post.isStarred ? <Star size={18} strokeWidth={1.5} fill="currentColor" /> : <StarOff size={18} strokeWidth={1.5} />}
                                    </button>
                                </div>

                                {/* 评论区 */}
                                {expandedComments === post.id && (
                                    <div className="comments-section">
                                        <div className="comments-header">
                                            <span className="comments-title">评论 ({post.comments.length})</span>
                                            <button className="comments-close" onClick={() => setExpandedComments(null)}>
                                                <X size={16} strokeWidth={1.5} />
                                            </button>
                                        </div>
                                        
                                        <div className="comment-input-wrapper">
                                            {replyTo?.postId === post.id && (
                                                <div className="reply-indicator">
                                                    <span>回复 @{replyTo.username}</span>
                                                    <button className="cancel-reply" onClick={cancelReply}>
                                                        <X size={14} strokeWidth={1.5} />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="comment-input-row">
                                                <input
                                                    ref={el => { inputRefs.current[post.id] = el }}
                                                    type="text"
                                                    placeholder={replyTo?.postId === post.id ? `回复 @${replyTo.username}...` : "写下你的评论..."}
                                                    value={commentInputs[post.id] || ''}
                                                    onChange={(e) => handleCommentInput(post.id, e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment(post.id)}
                                                />
                                                <button 
                                                    className="comment-submit-btn"
                                                    onClick={() => handleSubmitComment(post.id)}
                                                    disabled={!commentInputs[post.id]?.trim()}
                                                >
                                                    <Send size={16} strokeWidth={1.5} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="comments-list">
                                            {post.comments.length === 0 ? (
                                                <div className="no-comments">暂无评论，快来抢沙发吧~</div>
                                            ) : (
                                                post.comments.map(comment => (
                                                    <div key={comment.id} className="comment-item">
                                                        <img 
                                                            src={comment.author.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.username}`} 
                                                            alt={comment.author.nickname} 
                                                            className="comment-avatar" 
                                                        />
                                                        <div className="comment-body">
                                                            <div className="comment-header">
                                                                <span className="comment-username">{comment.author.nickname || comment.author.username}</span>
                                                                {comment.replyTo && (
                                                                    <span className="comment-reply-to">
                                                                        回复 <span className="reply-target">@{comment.replyTo}</span>
                                                                    </span>
                                                                )}
                                                                <span className="comment-time">{comment.time}</span>
                                                            </div>
                                                            <p className="comment-content">{comment.content}</p>
                                                            <div className="comment-actions">
                                                                <button 
                                                                    className={`comment-like-btn ${comment.isLiked ? 'liked' : ''}`}
                                                                    onClick={() => handleToggleCommentLike(post.id, comment.id)}
                                                                >
                                                                    <Heart size={14} strokeWidth={1.5} fill={comment.isLiked ? "currentColor" : "none"} />
                                                                    <span>{comment.likes}</span>
                                                                </button>
                                                                <button 
                                                                    className="comment-reply-btn"
                                                                    onClick={() => handleReply(post.id, comment.author.id, comment.author.nickname || comment.author.username)}
                                                                >
                                                                    回复
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </article>
                        ))
                    )}
                </section>
            </main>

            {/* 右侧边栏 */}
            <aside className="community-sidebar right-sidebar">
                <div className="sidebar-section">
                    <h3 className="sidebar-title">📢 社区公告</h3>
                    <div className="announcement">
                        {announcements.map(item => (
                            <p 
                                key={item.id} 
                                onClick={() => setAnnouncementModal({ title: item.title, content: item.content })}
                            >
                                {item.icon} {item.title}
                            </p>
                        ))}
                    </div>
                </div>
            </aside>

            {/* 公告弹窗 */}
            {announcementModal && (
                <div className="announcement-modal-overlay" onClick={() => setAnnouncementModal(null)}>
                    <div className="announcement-modal" onClick={e => e.stopPropagation()}>
                        <div className="announcement-modal-header">
                            <h3>📢 {announcementModal.title}</h3>
                            <button className="modal-close-btn" onClick={() => setAnnouncementModal(null)}>
                                <X size={18} strokeWidth={1.5} />
                            </button>
                        </div>
                        <div className="announcement-modal-content">
                            {announcementModal.content}
                        </div>
                        <div className="announcement-modal-footer">
                            <button className="modal-confirm-btn" onClick={() => setAnnouncementModal(null)}>
                                我知道了
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 回到顶部 */}
            <button 
                className={`back-to-top ${showBackTop ? 'show' : ''}`}
                onClick={scrollToTop}
                aria-label="回到顶部"
            >
                <ArrowUp size={20} strokeWidth={2} />
            </button>
        </div>
    )
}

export default Community
