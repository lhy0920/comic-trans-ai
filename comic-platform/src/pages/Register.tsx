import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Mail, Lock, User, Eye, EyeOff, Shield } from 'lucide-react'
import { authApi } from '../services/api'
import './Login.css'

function Register() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState('')

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const validateUsername = (name: string) => {
    const regex = /^[\u4e00-\u9fa5a-zA-Z0-9_]{2,16}$/
    return regex.test(name)
  }

  // 发送验证码
  const handleSendCode = async () => {
    if (!validateEmail(email)) {
      setError('请输入正确的邮箱格式')
      return
    }

    setSendingCode(true)
    setError('')

    try {
      await authApi.sendCode(email)
      setCountdown(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败')
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateUsername(username)) {
      setError('用户名2-16位，支持中英文、数字、下划线')
      return
    }

    if (!validateEmail(email)) {
      setError('请输入正确的邮箱格式')
      return
    }

    if (!code || code.length !== 6) {
      setError('请输入6位验证码')
      return
    }

    if (password.length < 6) {
      setError('密码至少6位')
      return
    }

    if (password !== confirmPwd) {
      setError('两次密码不一致')
      return
    }

    setLoading(true)

    try {
      // 先验证验证码
      await authApi.verifyCode(email, code)

      // 注册
      const data = await authApi.register(username, email, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Sparkles size={32} strokeWidth={1.5} />
          <h1>ComicFlow</h1>
          <p>创建你的账号 🎉</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          <div className="input-group">
            <User size={18} strokeWidth={1.5} />
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Mail size={18} strokeWidth={1.5} />
            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group code-group">
            <Shield size={18} strokeWidth={1.5} />
            <input
              type="text"
              placeholder="验证码"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
            <button
              type="button"
              className="send-code-btn"
              onClick={handleSendCode}
              disabled={sendingCode || countdown > 0}
            >
              {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
            </button>
          </div>

          <div className="input-group">
            <Lock size={18} strokeWidth={1.5} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="密码（至少6位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-pwd"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="input-group">
            <Lock size={18} strokeWidth={1.5} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="确认密码"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="auth-footer">
          已有账号？<Link to="/login">立即登录</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
