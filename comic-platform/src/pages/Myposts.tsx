import './Myposts.css'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Heart, MessageSquare, ExternalLink, Trash2, Edit3, Eye, EyeOff, Users, Camera } from 'lucide-react'
import { myPostApi, postApi, followApi, userApi } from '../services/api'
import toast from '../components/Toast'
import LinkifyText from '../components/LinkifyText'
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
    visibility: 'public' | 'followers' | 'private'
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

function Myposts() {
    const navigate = useNavigate()
    const [user, setUser] = useState<UserInfo | null>(null)
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [followingCount, setFollowingCount] = useState(0)
    const [followersCount, setFollowersCount] = useState(0)
    const [activeMenu, setActiveMenu] = useState<string | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    // 加载用户信息
    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (stored) {
            setUser(JSON.parse(stored))
        }
    }, [])

    // 加载帖子和关注数据
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true)
                const [postsData, countData] = await Promise.all([
                    myPostApi.getMyPosts(1, 50),
                    followApi.getCount()
                ])
                
                if (postsData.success) {
                    setPosts(postsData.posts)
                }
                if (countData.success) {
                    setFollowingCount(countData.followingCount)
                    setFollowersCount(countData.followersCount)
                }
            } catch (error) {
                console.error('加载数据失败:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setActiveMenu(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // 删除帖子
    const handleDelete = async (postId: string) => {
        if (!window.confirm('确定要删除这条帖子吗？')) return
        
        try {
            const data = await postApi.deletePost(postId)
            if (data.success) {
                setPosts(posts.filter(p => p.id !== postId))
                toast.success('删除成功')
            }
        } catch (error) {
            toast.error('删除失败')
        }
        setActiveMenu(null)
    }

    // 修改帖子 - 跳转到发布页面
    const handleEdit = (post: Post) => {
        setActiveMenu(null)
        // 将帖子数据通过 state 传递到发布页面
        navigate('/publish-post', { 
            state: { 
                editMode: true,
                postId: post.id,
                title: post.title,
                content: post.content,
                images: post.images,
                tags: post.tags,
                visibility: post.visibility
            } 
        })
    }

    // 保存修改 - 不再需要，改为跳转
    // const handleSaveEdit = async () => { ... }

    // 更新可见性
    const handleVisibility = async (postId: string, visibility: 'public' | 'followers' | 'private') => {
        try {
            const data = await myPostApi.updateVisibility(postId, visibility)
            if (data.success) {
                setPosts(posts.map(p => 
                    p.id === postId ? { ...p, visibility } : p
                ))
                toast.success('设置成功')
            }
        } catch (error) {
            toast.error('设置失败')
        }
        setActiveMenu(null)
    }

    const getVisibilityText = (v: string) => {
        switch (v) {
            case 'public': return '公开'
            case 'followers': return '仅粉丝可见'
            case 'private': return '仅自己可见'
            default: return '公开'
        }
    }

    const getVisibilityIcon = (v: string) => {
        switch (v) {
            case 'public': return <Eye size={14} />
            case 'followers': return <Users size={14} />
            case 'private': return <EyeOff size={14} />
            default: return <Eye size={14} />
        }
    }

    // 上传封面
    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('请选择图片文件')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('图片大小不能超过5MB')
            return
        }

        try {
            const data = await userApi.uploadCover(file)
            if (data.success) {
                const newUser = { ...user!, cover: data.cover }
                setUser(newUser)
                localStorage.setItem('user', JSON.stringify(newUser))
                toast.success('封面更新成功')
            }
        } catch (error) {
            toast.error('上传失败')
        }
    }

    if (!user) return null

    return (
        <div className="myposts-page">
            {/* 封面区域 */}
            <div className="cover-section">
                <div 
                    className="cover-image"
                    style={{ backgroundImage: user.cover ? `url(${user.cover})` : 'linear-gradient(135deg, #ff9eb5 0%, #7ec8e3 100%)' }}
                >
                    <input 
                        type="file" 
                        ref={coverInputRef}
                        accept="image/*"
                        onChange={handleCoverUpload}
                        style={{ display: 'none' }}
                    />
                    <button className="change-cover-btn" onClick={() => coverInputRef.current?.click()}>
                        <Camera size={16} />
                        更换封面
                    </button>
                </div>
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
            </div>

            {/* 用户信息 */}
            <div className="user-section">
                <img 
                    src={user.avatar || DEFAULT_AVATAR} 
                    alt={user.nickname} 
                    className="user-avatar"
                />
                <div className="user-info">
                    <h2 className="user-nickname">{user.nickname || user.username}</h2>
                    <p className="user-signature">{user.signature || '这个人很懒，什么都没写~'}</p>
                </div>
                <div className="user-stats">
                    <div className="stat-item" onClick={() => navigate('/following')}>
                        <span className="stat-num">{followingCount}</span>
                        <span className="stat-label">关注</span>
                    </div>
                    <div className="stat-item" onClick={() => navigate('/followers')}>
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
                <h3 className="section-title">我的帖子</h3>
                
                {loading ? (
                    <div className="loading">加载中...</div>
                ) : posts.length === 0 ? (
                    <div className="empty">
                        <p>还没有发布过帖子</p>
                        <button onClick={() => navigate('/publish-post')}>去发布</button>
                    </div>
                ) : (
                    <div className="posts-list">
                        {posts.map(post => (
                            <div key={post.id} className="post-item">
                                <div className="post-header">
                                    <span className="post-time">{post.time}</span>
                                    <div className="post-visibility">
                                        {getVisibilityIcon(post.visibility)}
                                        <span>{getVisibilityText(post.visibility)}</span>
                                    </div>
                                    <button 
                                        className="more-btn"
                                        onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)}
                                    >
                                        <MoreHorizontal size={30} />
                                    </button>
                                    
                                    {/* 操作菜单 */}
                                    {activeMenu === post.id && (
                                        <div className="action-menu" ref={menuRef}>
                                            <button onClick={() => handleEdit(post)}>
                                                <Edit3 size={16} /> 修改
                                            </button>
                                            <button onClick={() => handleDelete(post.id)}>
                                                <Trash2 size={16} /> 删除
                                            </button>
                                            <div className="menu-divider" />
                                            <div className="menu-label">可见性</div>
                                            <button 
                                                className={post.visibility === 'public' ? 'active' : ''}
                                                onClick={() => handleVisibility(post.id, 'public')}
                                            >
                                                <Eye size={16} /> 公开
                                            </button>
                                            <button 
                                                className={post.visibility === 'followers' ? 'active' : ''}
                                                onClick={() => handleVisibility(post.id, 'followers')}
                                            >
                                                <Users size={16} /> 仅粉丝可见
                                            </button>
                                            <button 
                                                className={post.visibility === 'private' ? 'active' : ''}
                                                onClick={() => handleVisibility(post.id, 'private')}
                                            >
                                                <EyeOff size={16} /> 仅自己可见
                                            </button>
                                        </div>
                                    )}
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
        </div>
    )
}

export default Myposts
