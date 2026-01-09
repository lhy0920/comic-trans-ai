import './FollowList.css'
import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react'
import { followApi } from '../services/api'
import toast from '../components/Toast'

interface UserItem {
    id: string
    username: string
    nickname: string
    avatar: string
    signature: string
    isFollowing?: boolean
}

function FollowList() {
    const navigate = useNavigate()
    const location = useLocation()
    const { userId } = useParams()
    
    // 根据路径判断是关注列表还是粉丝列表
    const isFollowing = location.pathname.includes('/following')
    const [users, setUsers] = useState<UserItem[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string>('')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (stored) {
            const user = JSON.parse(stored)
            setCurrentUserId(user.id)
        }
    }, [])

    useEffect(() => {
        const loadUsers = async () => {
            try {
                setLoading(true)
                const data = isFollowing 
                    ? await followApi.getFollowing(userId)
                    : await followApi.getFollowers(userId)
                
                if (data.success) {
                    // 检查每个用户的关注状态
                    const usersWithStatus = await Promise.all(
                        data.users.map(async (user: UserItem) => {
                            if (user.id === currentUserId) {
                                return { ...user, isFollowing: false }
                            }
                            try {
                                const checkData = await followApi.checkFollow(user.id)
                                return { ...user, isFollowing: checkData.isFollowing }
                            } catch {
                                return { ...user, isFollowing: false }
                            }
                        })
                    )
                    setUsers(usersWithStatus)
                }
            } catch (error) {
                console.error('加载列表失败:', error)
                toast.error('加载失败')
            } finally {
                setLoading(false)
            }
        }
        
        if (currentUserId) {
            loadUsers()
        }
    }, [isFollowing, userId, currentUserId])

    const handleToggleFollow = async (targetUserId: string) => {
        try {
            const data = await followApi.toggleFollow(targetUserId)
            if (data.success) {
                setUsers(users.map(u => 
                    u.id === targetUserId 
                        ? { ...u, isFollowing: data.isFollowing }
                        : u
                ))
                toast.success(data.isFollowing ? '关注成功' : '已取消关注')
            }
        } catch (error) {
            toast.error('操作失败')
        }
    }

    return (
        <div className="follow-list-page">
            <header className="follow-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <h1 style={{marginLeft:'60px'}}>{isFollowing ? '关注列表' : '粉丝列表'}</h1>
                <div className="placeholder" />
            </header>

            <div className="follow-content">
                {loading ? (
                    <div className="loading">加载中...</div>
                ) : users.length === 0 ? (
                    <div className="empty">
                        {isFollowing ? '还没有关注任何人' : '还没有粉丝'}
                    </div>
                ) : (
                    <div className="user-list">
                        {users.map(user => (
                            <div key={user.id} className="user-item">
                                <img 
                                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                    alt={user.nickname}
                                    className="user-avatar"
                                />
                                <div className="user-info">
                                    <span className="user-nickname">{user.nickname || user.username}</span>
                                    <span className="user-signature">{user.signature || '这个人很懒，什么都没写~'}</span>
                                </div>
                                {user.id !== currentUserId && (
                                    <button 
                                        className={`follow-btn ${user.isFollowing ? 'following' : ''}`}
                                        onClick={() => handleToggleFollow(user.id)}
                                    >
                                        {user.isFollowing ? (
                                            <>
                                                <UserMinus size={16} />
                                                已关注
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus size={16} />
                                                关注
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default FollowList
