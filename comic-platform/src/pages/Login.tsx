import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../services/api'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateEmail(email)) {
      setError('请输入正确的邮箱格式')
      return
    }

    if (password.length < 6) {
      setError('密码至少6位')
      return
    }

    setLoading(true)

    try {
      const data = await authApi.login(email, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
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
          <p>欢迎回来 ✨</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

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

          <div className="input-group">
            <Lock size={18} strokeWidth={1.5} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="密码"
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

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="auth-footer">
          还没有账号？<Link to="/register">立即注册</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
