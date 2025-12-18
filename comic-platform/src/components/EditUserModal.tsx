import { useState } from 'react'

export interface UserFormData {
  username: string
  nickname: string
  signature: string
  gender: string
  birthday: string
  phone: string
  email: string
}

interface EditUserModalProps {
  user: UserFormData
  onSave: (data: UserFormData) => Promise<void>
  onClose: () => void
}

interface FormErrors {
  username?: string
  nickname?: string
  phone?: string
  email?: string
}

function EditUserModal({ user, onSave, onClose }: EditUserModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    username: user.username || '',
    nickname: user.nickname || '',
    signature: user.signature || '',
    gender: user.gender || '',
    birthday: user.birthday || '',
    phone: user.phone || '',
    email: user.email || '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  // 验证邮箱
  const validateEmail = (email: string): boolean => {
    if (!email) return true
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  // 验证手机号
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true
    const regex = /^1[3-9]\d{9}$/
    return regex.test(phone)
  }

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.username.trim()) {
      newErrors.username = '用户名不能为空'
    } else if (formData.username.length < 2) {
      newErrors.username = '用户名至少2个字符'
    }

    if (!formData.nickname.trim()) {
      newErrors.nickname = '昵称不能为空'
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = '手机号格式不正确'
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = '邮箱格式不正确'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      await onSave(formData)
    } catch (err) {
      console.error('保存失败:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="edituser-overlay" onClick={onClose} />
      <div className="edituser">
        <div className="edit-user-title">
          <span className="title-text">编辑用户信息</span>
        </div>

        <div className="info-list">
          <div className="info-item">
            <span className="info-label">用户名</span>
            <input
              type="text"
              className={`edit-user-input ${errors.username ? 'error' : ''}`}
              value={formData.username}
              onChange={e => handleChange('username', e.target.value)}
              placeholder="请输入用户名"
            />
          </div>
          {errors.username && <span style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '-8px', marginBottom: '8px' }}>{errors.username}</span>}

          <div className="info-item">
            <span className="info-label">昵称</span>
            <input
              type="text"
              className={`edit-user-input ${errors.nickname ? 'error' : ''}`}
              value={formData.nickname}
              onChange={e => handleChange('nickname', e.target.value)}
              placeholder="请输入昵称"
            />
          </div>
          {errors.nickname && <span style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '-8px', marginBottom: '8px' }}>{errors.nickname}</span>}

          <div className="info-item">
            <span className="info-label">个性签名</span>
            <input
              type="text"
              className="edit-user-input"
              value={formData.signature}
              onChange={e => handleChange('signature', e.target.value)}
              placeholder="分享你的个性签名..."
            />
          </div>

          <div className="info-item">
            <span className="info-label">性别</span>
            <select
              className="edit-user-input"
              value={formData.gender}
              onChange={e => handleChange('gender', e.target.value)}
            >
              <option value="">请选择性别</option>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div className="info-item">
            <span className="info-label">生日</span>
            <input
              type="date"
              className="edit-user-input"
              value={formData.birthday}
              onChange={e => handleChange('birthday', e.target.value)}
            />
          </div>

          <div className="info-item">
            <span className="info-label">手机号</span>
            <input
              type="tel"
              className={`edit-user-input ${errors.phone ? 'error' : ''}`}
              value={formData.phone}
              onChange={e => handleChange('phone', e.target.value)}
              placeholder="请输入手机号"
            />
          </div>
          {errors.phone && <span style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '-8px', marginBottom: '8px' }}>{errors.phone}</span>}

          <div className="info-item">
            <span className="info-label">邮箱</span>
            <input
              type="email"
              className={`edit-user-input ${errors.email ? 'error' : ''}`}
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="请输入邮箱"
            />
          </div>
          {errors.email && <span style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '-8px', marginBottom: '8px' }}>{errors.email}</span>}
        </div>

        <div className="edit-user-btn">
          <button className="edit-user-btn-confirm" onClick={handleSubmit} disabled={loading}>
            <span className="btn-text">{loading ? '保存中...' : '确认'}</span>
            <span className="btn-icon">✓</span>
          </button>
          <button className="edit-user-btn-reject" onClick={onClose}>
            <span className="btn-text">取消</span>
            <span className="btn-icon">✕</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default EditUserModal
