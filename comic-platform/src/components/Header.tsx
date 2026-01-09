import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Sparkles,
  Mail,
  User,
  Languages,
  BookOpen,
  LogOut,
  MessagesSquare
} from 'lucide-react'
import { DEFAULT_AVATAR } from '../constants/avatar'
import { messageApi } from '../services/api'
import { socketService } from '../services/socket'
import ConfirmModal from './ConfirmModal'
import './Header.css'

interface UserInfo {
  id: string
  username: string
  nickname: string
  avatar?: string
}

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      setUser(JSON.parse(stored))
      loadUnreadCount()
      socketService.connect()
    }
  }, [location])

  // 监听新消息和通知
  useEffect(() => {
    const handleNewMessage = () => {
      setUnreadCount(prev => prev + 1)
    }

    const handleNewNotification = () => {
      setUnreadCount(prev => prev + 1)
    }

    socketService.on('message:receive', handleNewMessage)
    socketService.on('notification:new', handleNewNotification)

    return () => {
      socketService.off('message:receive', handleNewMessage)
      socketService.off('notification:new', handleNewNotification)
    }
  }, [])

  const loadUnreadCount = async () => {
    try {
      const data = await messageApi.getUnreadCount()
      setUnreadCount(data.total)
    } catch (error) {
      console.error('获取未读数失败:', error)
    }
  }

  const isActive = (path: string) => location.pathname === path

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    socketService.disconnect()
    setShowLogoutConfirm(false)
    navigate('/login')
  }

  return (
    <>
      {showLogoutConfirm && (
        <ConfirmModal
          title="退出登录"
          message="确定要退出当前账号吗？"
          confirmText="退出"
          cancelText="取消"
          danger
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
      <header className="app-header">
      <div className="header-left">
        <span className="logo" onClick={() => navigate('/')}>
          <Sparkles size={22} strokeWidth={1.5} />
          ComicFlow
        </span>
      </div>
      <nav className="header-nav">
        <button
          className={`nav-link ${isActive('/') ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          首页
        </button>
        <button
          className={`nav-link ${isActive('/translate') ? 'active' : ''}`}
          onClick={() => navigate('/translate')}
        >
          <Languages size={16} strokeWidth={1.5} />
          翻译
        </button>
         <button
          className={`nav-link ${isActive('/community') ? 'active' : ''}`}
          onClick={() => navigate('/community')}
        >
          <MessagesSquare size={16} strokeWidth={1.5} />
          社区
        </button>
        <button
          className={`nav-link ${isActive('/bookshelf') ? 'active' : ''}`}
          onClick={() => navigate('/bookshelf')}
        >
          <BookOpen size={16} strokeWidth={1.5} />
          书架
        </button>
        <button
          className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
          onClick={() => navigate('/profile')}
        >
          <User size={16} strokeWidth={1.5} />
          个人
        </button>
      </nav>
      <div className="header-right">
        <button className="icon-btn mail-btn" onClick={() => navigate('/mail')}>
          <Mail size={20} strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="unread-dot">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
        {user ? (
          <div className="user-menu">
            <button
              className="icon-btn avatar-btn"
              onClick={() => navigate('/profile')}
            >
              <img src={user.avatar || DEFAULT_AVATAR} alt={user.nickname} className="user-avatar" />
            </button>
            <span className="user-name">{user.nickname}</span>
            <button className="icon-btn logout-btn" onClick={() => setShowLogoutConfirm(true)} title="退出登录">
              <LogOut size={18} strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <button className="login-btn" onClick={() => navigate('/login')}>
            登录
          </button>
        )}
      </div>
    </header>
    </>
  )
}

export default Header
