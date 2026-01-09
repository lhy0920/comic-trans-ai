import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Settings,
  Star,
  History,
  ChevronRight,
  Mail,
  Phone,
  UserCircle,
  Edit3,
  VenusAndMars,
  Signature,
  UserRoundPen,
  Cake,
  Users,
  UserPlus,
  StickyNote,
  UserX,
  KeyRound,
} from 'lucide-react'
import { userApi, historyApi, followApi, authApi } from '../services/api'
import PdfCover from '../components/PdfCover'
import AvatarUpload from '../components/AvatarUpload'
import EditUserModal, { type UserFormData } from '../components/EditUserModal'
import ConfirmModal from '../components/ConfirmModal'
import toast from '../components/Toast'
import { DEFAULT_AVATAR } from '../constants/avatar'
import './Profile.css'

interface UserInfo {
  id: string
  username: string
  email: string
  nickname: string
  avatar?: string
  signature?: string
  gender?: string
  birthday?: string
  phone?: string
}

interface HistoryItem {
  id: string
  title: string
  cover: string
  chapter: string
  time: string
}

function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [passwordCode, setPasswordCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [passwordCountdown, setPasswordCountdown] = useState(0)

  // 从 localStorage 加载用户信息
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      setUser(JSON.parse(stored))
    }
  }, [])

  // 加载浏览历史
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const data = await historyApi.getHistory()
        if (data.success) {
          setHistory(data.histories)
        }
      } catch (error) {
        console.error('加载浏览历史失败:', error)
      }
    }
    loadHistory()
  }, [])

  // 加载关注/粉丝数量
  useEffect(() => {
    const loadFollowCount = async () => {
      try {
        const data = await followApi.getCount()
        if (data.success) {
          setFollowingCount(data.followingCount)
          setFollowersCount(data.followersCount)
        }
      } catch (error) {
        console.error('加载关注数量失败:', error)
      }
    }
    loadFollowCount()
  }, [])

  // 保存用户信息
  const handleSaveProfile = async (formData: UserFormData) => {
    try {
      await userApi.updateProfile(formData)
      // 更新本地状态，保留头像
      const newUser = { ...user!, ...formData }
      setUser(newUser)
      localStorage.setItem('user', JSON.stringify(newUser))
      setShowEditModal(false)
      toast.success('保存成功')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
      throw err
    }
  }

  // 保存新头像
  const handleAvatarSave = async (avatarBlob: Blob) => {
    try {
      const file = new File([avatarBlob], 'avatar.jpg', { type: 'image/jpeg' })
      const data = await userApi.uploadAvatar(file)
      
      // 更新本地状态（后端已返回完整 URL）
      const newUser = { ...user!, avatar: data.avatar }
      setUser(newUser)
      localStorage.setItem('user', JSON.stringify(newUser))
      setShowAvatarUpload(false)
      toast.success('头像更新成功')
    } catch (error) {
      console.error('上传头像失败:', error)
      toast.error('上传头像失败')
    }
  }

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setShowLogoutConfirm(false)
    navigate('/login')
  }

  // 注销账户
  const handleDeleteAccount = async () => {
    try {
      await authApi.deleteAccount()
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      toast.success('账户已注销')
      navigate('/login')
    } catch (error) {
      toast.error('注销失败，请稍后重试')
    }
  }

  // 发送验证码（修改邮箱用）
  const handleSendCode = async () => {
    if (!newEmail || sendingCode) return
    try {
      setSendingCode(true)
      await authApi.sendCode(newEmail)
      toast.success('验证码已发送')
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      toast.error('发送失败')
    } finally {
      setSendingCode(false)
    }
  }

  // 发送验证码（修改密码用，发送到当前邮箱）
  const handleSendPasswordCode = async () => {
    if (!user?.email || passwordCountdown > 0) return
    try {
      await authApi.sendCode(user.email)
      toast.success('验证码已发送到您的邮箱')
      setPasswordCountdown(60)
      const timer = setInterval(() => {
        setPasswordCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      toast.error('发送失败')
    }
  }

  // 修改邮箱
  const handleChangeEmail = async () => {
    if (!newEmail || !emailCode) {
      toast.error('请填写完整信息')
      return
    }
    try {
      await authApi.changeEmail(newEmail, emailCode)
      const newUser = { ...user!, email: newEmail }
      setUser(newUser)
      localStorage.setItem('user', JSON.stringify(newUser))
      setShowChangeEmail(false)
      setNewEmail('')
      setEmailCode('')
      toast.success('邮箱修改成功')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '修改失败')
    }
  }

  // 修改密码
  const handleChangePassword = async () => {
    if (!passwordCode || !newPassword || !confirmPassword) {
      toast.error('请填写完整信息')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次密码不一致')
      return
    }
    if (newPassword.length < 6) {
      toast.error('密码至少6位')
      return
    }
    try {
      await authApi.changePassword(passwordCode, newPassword)
      setShowChangePassword(false)
      setPasswordCode('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('密码修改成功，请重新登录')
      handleLogout()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '修改失败')
    }
  }

  if (!user) return null

  return (
    <div className="profile-page">
      {/* 退出登录确认弹窗 */}
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

      {/* 注销账户确认弹窗 */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="注销账户"
          message="注销后账户数据将被永久删除，无法恢复。确定要注销吗？"
          confirmText="确认注销"
          cancelText="取消"
          danger
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* 修改邮箱弹窗 */}
      {showChangeEmail && (
        <div className="modal-overlay" onClick={() => setShowChangeEmail(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>修改邮箱</h3>
            <p className="modal-tip">当前邮箱：{user.email}</p>
            <div className="modal-form">
              <input
                type="email"
                placeholder="新邮箱地址"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
              <div className="code-input-row">
                <input
                  type="text"
                  placeholder="验证码"
                  value={emailCode}
                  onChange={e => setEmailCode(e.target.value)}
                />
                <button
                  className="send-code-btn"
                  onClick={handleSendCode}
                  disabled={sendingCode || countdown > 0}
                >
                  {countdown > 0 ? `${countdown}s` : '发送验证码'}
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowChangeEmail(false)}>取消</button>
              <button className="confirm-btn" onClick={handleChangeEmail}>确认修改</button>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码弹窗 */}
      {showChangePassword && (
        <div className="modal-overlay" onClick={() => setShowChangePassword(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>修改密码</h3>
            <p className="modal-tip">验证码将发送到：{user.email}</p>
            <div className="modal-form">
              <div className="code-input-row">
                <input
                  type="text"
                  placeholder="邮箱验证码"
                  value={passwordCode}
                  onChange={e => setPasswordCode(e.target.value)}
                />
                <button
                  className="send-code-btn"
                  onClick={handleSendPasswordCode}
                  disabled={passwordCountdown > 0}
                >
                  {passwordCountdown > 0 ? `${passwordCountdown}s` : '获取验证码'}
                </button>
              </div>
              <input
                type="password"
                placeholder="新密码（至少6位）"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="确认新密码"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowChangePassword(false)}>取消</button>
              <button className="confirm-btn" onClick={handleChangePassword}>确认修改</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑用户弹窗 */}
      {showEditModal && (
        <EditUserModal
          user={{
            username: user.username,
            nickname: user.nickname,
            signature: user.signature || '这个人懒懒的，什么也不说',
            gender: user.gender || '',
            birthday: user.birthday || '',
            phone: user.phone || '',
            email: user.email,
          }}
          onSave={handleSaveProfile}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <section className="user-card">
        <div className="user-avatar">
          <img src={user.avatar || DEFAULT_AVATAR} alt="头像" />
          <button className="edit-avatar" onClick={() => setShowAvatarUpload(true)}>
            <Edit3 size={14} strokeWidth={1.5} />
          </button>
        </div>
        <div className="user-info">
          <h2 className="user-name">{user.nickname}</h2>
          <p className="user-signature">{user.signature || ""}</p>
          {/* 粉丝/关注数量 */}
          <div className="follow-stats">
            <div className="follow-stat-item" onClick={() => navigate('/following')}>
              <UserPlus size={16} strokeWidth={1.5} />
              <span className="follow-stat-num">{followingCount}</span>
              <span className="follow-stat-label">关注</span>
            </div>
            <div className="follow-stat-divider" />
            <div className="follow-stat-item" onClick={() => navigate('/followers')}>
              <Users size={16} strokeWidth={1.5} />
              <span className="follow-stat-num">{followersCount}</span>
              <span className="follow-stat-label">粉丝</span>
            </div>
          </div>
        </div>
        <div className='edit-user-info'>
          <button className='edit-userinfo' onClick={() => setShowEditModal(true)}>编辑用户信息</button>
        </div>
      </section>

      {/* 头像上传弹窗 */}
      {showAvatarUpload && (
        <AvatarUpload
          currentAvatar={user.avatar || ''}
          onSave={(blob: Blob) => handleAvatarSave(blob)}
          onClose={() => setShowAvatarUpload(false)}
        />
      )}
        {/* 我的空间 */}
      <section className="profile-section">
        <div
          className="section-header clickable"
          onClick={() => navigate('/myposts')}
        >
          <h3>
            <StickyNote size={18} strokeWidth={1.5} />
            我的发布
          </h3>
          <ChevronRight
            size={18}
            strokeWidth={1.5}
            className={activeSection === 'info' ? 'rotated' : ''}
          />
        </div>
        
      </section>
      {/* 历史记录 */}
      <section className="profile-section">
        <div
          className="section-header clickable"
          onClick={() => setActiveSection(activeSection === 'history' ? null : 'history')}
        >
          <h3>
            <History size={18} strokeWidth={1.5} />
            观看历史
          </h3>
          <ChevronRight
            size={18}
            strokeWidth={1.5}
            className={activeSection === 'history' ? 'rotated' : ''}
          />
        </div>
        {activeSection === 'history' && (
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id} className="history-item">
                <PdfCover
                  pdfUrl={`http://localhost:5000/api/comics/local/${item.id}/chapter/1`}
                  alt={item.title}
                  className="history-cover"
                />
                <div className="history-info">
                  <p className="history-title">{item.title}</p>
                  <p className="history-time">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 收藏夹 - 跳转到收藏帖子页面 */}
      <section className="profile-section">
        <div
          className="section-header clickable"
          onClick={() => navigate('/starred')}
        >
          <h3>
            <Star size={18} strokeWidth={1.5} />
            我的收藏
          </h3>
          <ChevronRight size={18} strokeWidth={1.5} />
        </div>
      </section>

      {/* 个人信息 */}
      <section className="profile-section">
        <div
          className="section-header clickable"
          onClick={() => setActiveSection(activeSection === 'info' ? null : 'info')}
        >
          <h3>
            <UserCircle size={18} strokeWidth={1.5} />
            个人信息
          </h3>
          <ChevronRight
            size={18}
            strokeWidth={1.5}
            className={activeSection === 'info' ? 'rotated' : ''}
          />
        </div>
        {activeSection === 'info' && (
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">
                <User size={16} strokeWidth={1.5} />
                用户名
              </span>
              <span className="info-value">{user.username}</span>
            </div>
            <div className="info-item">
              <span className="info-label">
                <UserRoundPen size={16} strokeWidth={1.5} />
                账户名
              </span>
              <span className="info-value">{user.nickname}</span>
            </div>
            <div className="info-item">
              <span className="info-label">
                <Signature size={16} strokeWidth={1.5} />
                个性签名
              </span>
              <span className="info-value">{user.signature}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">
                <VenusAndMars size={16} strokeWidth={1.5} />
                性别
              </span>
              <span className="info-value">{user.gender}</span>
            </div>
            <div className="info-item">
              <span className="info-label">
                <Cake size={16} strokeWidth={1.5} />
                生日
              </span>
              <span className="info-value">{user.birthday}</span>
            </div>
            <div className="info-item">
              <span className="info-label">
                <Phone size={16} strokeWidth={1.5} />
                手机号
              </span>
              <span className="info-value">{user.phone}</span>
            </div>
            <div className="info-item">
              <span className="info-label">
                <Mail size={16} strokeWidth={1.5} />
                邮箱
              </span>
              <span className="info-value">{user.email}</span>
            </div>
          </div>
        )}
      </section>

      {/* 设置 */}
      <section className="profile-section">
        <div
          className="section-header clickable"
          onClick={() => setActiveSection(activeSection === 'settings' ? null : 'settings')}
        >
          <h3>
            <Settings size={18} strokeWidth={1.5} />
            设置
          </h3>
          <ChevronRight
            size={18}
            strokeWidth={1.5}
            className={activeSection === 'settings' ? 'rotated' : ''}
          />
        </div>
        {activeSection === 'settings' && (
          <div className="settings-list">
            <button className="settings-item">
              <span>清除缓存</span>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
            <div className="settings-group">
              <div
                className="settings-item expandable"
                onClick={() => setActiveSection('privacy')}
              >
                <span> 隐私设置</span>
                <ChevronRight size={16} strokeWidth={1.5} />
              </div>
            </div>
            <button className="settings-item" onClick={()=>navigate('/aboutus')}>
              <span>关于我们</span>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
            <button className="settings-item" onClick={()=>navigate('/privacypolicy')}>
              <span>用户协议</span>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
            <button className="settings-item logout" onClick={() => setShowLogoutConfirm(true)}>
              <span>退出登录</span>
            </button>
          </div>
        )}
        {activeSection === 'privacy' && (
          <div className="settings-list privacy-settings">
            <button className="settings-item back-item" onClick={() => setActiveSection('settings')}>
              <ChevronRight size={16} strokeWidth={1.5} className="back-icon" />
              <span>返回设置</span>
            </button>
            <button className="settings-item" onClick={() => setShowChangeEmail(true)}>
              <span><Mail size={16} /> 修改邮箱</span>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
            <button className="settings-item" onClick={() => setShowChangePassword(true)}>
              <span><KeyRound size={16} /> 修改密码</span>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
            <button className="settings-item danger" onClick={() => setShowDeleteConfirm(true)}>
              <span><UserX size={16} /> 注销账户</span>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default Profile
