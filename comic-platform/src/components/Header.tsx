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

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      setUser(JSON.parse(stored))
    }
  }, [location])

  const isActive = (path: string) => location.pathname === path

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }

  return (
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
        <button className="icon-btn">
          <Mail size={20} strokeWidth={1.5} />
        </button>
        {user ? (
          <div className="user-menu">
            <button
              className="icon-btn avatar-btn"
              onClick={() => navigate('/profile')}
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.nickname} className="user-avatar" />
              ) : (
                <User size={20} strokeWidth={1.5} />
              )}
            </button>
            <span className="user-name">{user.nickname}</span>
            <button className="icon-btn logout-btn" onClick={handleLogout} title="退出登录">
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
  )
}

export default Header
