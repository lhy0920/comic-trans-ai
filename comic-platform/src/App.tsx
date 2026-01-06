import { lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Home as HomeIcon, BookOpen, Languages, User,MessagesSquare } from 'lucide-react'
import Header from './components/Header'
import AuthGuard from './components/AuthGuard'
import { ToastContainer } from './components/Toast'
import './App.css'

// 路由懒加载
const Home = lazy(() => import('./pages/Home'))
const Translate = lazy(() => import('./pages/Translate'))
const Bookshelf = lazy(() => import('./pages/Bookshelf'))
const ComicDetail = lazy(() => import('./pages/ComicDetail'))
const ComicReader = lazy(() => import('./pages/ComicReader'))
const Profile = lazy(() => import('./pages/Profile'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Community = lazy(() => import('./pages/community'))
const PublishPost = lazy(() => import('./pages/PublishPost'))
const Myposts = lazy(() => import('./pages/Myposts'))
const FollowList = lazy(() => import('./pages/FollowList'))

// 加载中组件
const PageLoading = () => (
  <div className="page-loading">
    <div className="loading-spinner" />
  </div>
)

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  // 阅读页面不显示导航
  const hideNav = location.pathname.includes('/read/') || 
    location.pathname === '/login' || 
    location.pathname === '/register'

  // 漫画详情页也隐藏公共Header（它有自己的）
  const hideHeader =
    hideNav || location.pathname.match(/^\/comic\/\d+$/)

  return (
    <div className="app">
      {/* 全局 Toast */}
      <ToastContainer />
      
      {/* PC端顶部导航 */}
      {!hideHeader && <Header />}

      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* 登录/注册 - 已登录则跳转首页 */}
          <Route path="/login" element={
            <AuthGuard requireAuth={false}><Login /></AuthGuard>
          } />
          <Route path="/register" element={
            <AuthGuard requireAuth={false}><Register /></AuthGuard>
          } />
          
          {/* 需要登录的页面 */}
          <Route path="/" element={
            <AuthGuard><Home /></AuthGuard>
          } />
          <Route path="/comic/:id" element={
            <AuthGuard><ComicDetail /></AuthGuard>
          } />
          <Route path="/translate" element={
            <AuthGuard><Translate /></AuthGuard>
          } />
          <Route path="/Community" element={
            <AuthGuard><Community /></AuthGuard>
          } />
          <Route path="/publish-post" element={
            <AuthGuard><PublishPost /></AuthGuard>
          } />
          <Route path="/bookshelf" element={
            <AuthGuard><Bookshelf /></AuthGuard>
          } />
          <Route path="/profile" element={
            <AuthGuard><Profile /></AuthGuard>
          } />
          <Route path="/myposts" element={
            <AuthGuard><Myposts /></AuthGuard>
          } />
          <Route path="/following/:userId?" element={
            <AuthGuard><FollowList /></AuthGuard>
          } />
          <Route path="/followers/:userId?" element={
            <AuthGuard><FollowList /></AuthGuard>
          } />
          <Route path="/comic/:id/read/:chapterId" element={
            <AuthGuard><ComicReader /></AuthGuard>
          } />
        </Routes>
      </Suspense>

      {/* 移动端底部导航 */}
      {!hideNav && (
        <nav className="bottom-nav">
          <button
            className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <HomeIcon size={22} strokeWidth={1.5} />
            <span className="nav-text">首页</span>
          </button>

          <button
            className={`nav-item ${location.pathname === '/translate' ? 'active' : ''}`}
            onClick={() => navigate('/translate')}
          >
            <Languages size={22} strokeWidth={1.5} />
            <span className="nav-text">翻译</span>
          </button>
         <button
            className={`nav-item ${location.pathname === '/community' ? 'active' : ''}`}
            onClick={() => navigate('/community')}
          >
            <MessagesSquare size={22} strokeWidth={1.5} />
            <span className="nav-text">社区</span>
          </button>
          <button
            className={`nav-item ${location.pathname === '/bookshelf' ? 'active' : ''}`}
            onClick={() => navigate('/bookshelf')}
          >
            <BookOpen size={22} strokeWidth={1.5} />
            <span className="nav-text">书架</span>
          </button>

          <button
            className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}
            onClick={() => navigate('/profile')}
          >
            <User size={22} strokeWidth={1.5} />
            <span className="nav-text">我的</span>
          </button>
        </nav>
      )}
    </div>
  )
}

export default App
