import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Settings,
  FolderHeart,
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
} from 'lucide-react'
import { userApi, historyApi, followApi } from '../services/api'
import { initFolderDB, getAllFolders, type StoredFolder } from '../utils/folderStorage'
import PdfCover from '../components/PdfCover'
import AvatarUpload from '../components/AvatarUpload'
import EditUserModal, { type UserFormData } from '../components/EditUserModal'
import toast from '../components/Toast'
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

interface FolderItem {
  id: number
  name: string
  imageCount: number
}

function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)

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

  // 加载翻译页面的收藏夹
  useEffect(() => {
    const loadFolders = async () => {
      try {
        await initFolderDB()
        const storedFolders = await getAllFolders()
        setFolders(storedFolders.map((f: StoredFolder) => ({
          id: f.id,
          name: f.name,
          imageCount: f.imageCount
        })))
      } catch (error) {
        console.error('加载收藏夹失败:', error)
      }
    }
    loadFolders()
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
    navigate('/login')
  }

  if (!user) return null

  return (
    <div className="profile-page">
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
          <img src={user.avatar} alt="头像" />
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
            <UserCircle size={18} strokeWidth={1.5} />
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

      {/* 收藏夹 */}
      <section className="profile-section">
        <div
          className="section-header clickable"
          onClick={() => setActiveSection(activeSection === 'folders' ? null : 'folders')}
        >
          <h3>
            <FolderHeart size={18} strokeWidth={1.5} />
            我的收藏夹
          </h3>
          <ChevronRight
            size={18}
            strokeWidth={1.5}
            className={activeSection === 'folders' ? 'rotated' : ''}
          />
        </div>
        {activeSection === 'folders' && (
          <div className="folder-list">
            {folders.length === 0 ? (
              <div className="empty-tip">暂无收藏夹，去翻译页面创建吧～</div>
            ) : (
              folders.map((folder) => (
                <div key={folder.id} className="folder-item">
                  <FolderHeart size={20} strokeWidth={1.5} />
                  <span className="folder-name">{folder.name}</span>
                  <span className="folder-count">{folder.imageCount}张</span>
                </div>
              ))
            )}
          </div>
        )}
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
            <button className="settings-item">
              <span>隐私设置</span>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
            <button className="settings-item" onClick={()=>navigate('/aboutus')}>
              <span>关于我们</span>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
            <button className="settings-item" onClick={()=>navigate('/useragreement')}>
              <span>用户协议</span>
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
            <button className="settings-item logout" onClick={handleLogout}>
              <span>退出登录</span>
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default Profile
