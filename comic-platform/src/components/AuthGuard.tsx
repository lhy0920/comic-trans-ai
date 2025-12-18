import { Navigate, useLocation } from 'react-router-dom'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean // true: 需要登录才能访问, false: 已登录不能访问（如登录页）
}

function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const location = useLocation()
  const token = localStorage.getItem('token')
  const isLoggedIn = !!token

  // 需要登录但未登录 -> 跳转登录页
  if (requireAuth && !isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // 已登录但访问登录/注册页 -> 跳转首页
  if (!requireAuth && isLoggedIn) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default AuthGuard
