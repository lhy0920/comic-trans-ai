import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  PanelRightOpen,
  PanelRightClose,
  ChevronLeft,
  ChevronRight,
  Send,
  BookOpen,
  MessageCircle,
} from 'lucide-react'
import { historyApi } from '../services/api'
import './ComicReader.css'

interface Chapter {
  id: string
  title: string
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

function ComicReader() {
  const navigate = useNavigate()
  const { id, chapterId } = useParams()
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [chapters, setChapters] = useState<Chapter[]>([])
  const [currentChapterId, setCurrentChapterId] = useState(chapterId || '1')
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'chapters' | 'chat'>('chapters')
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: '你好！我是漫画小助手 ✨ 可以帮你总结剧情、解释人物关系，有什么想问的吗？',
    },
  ])

  // 加载漫画章节列表
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/comics/local/${id}`)
        const data = await res.json()
        if (data.success && data.comic.chapters) {
          setChapters(data.comic.chapters)
        }
      } catch (error) {
        console.error('加载章节失败:', error)
      }
    }
    if (id) loadChapters()
  }, [id])

  // 加载当前章节 PDF 并记录浏览历史
  useEffect(() => {
    if (id && currentChapterId) {
      setLoading(true)
      const url = `http://localhost:5000/api/comics/local/${id}/chapter/${currentChapterId}`
      setPdfUrl(url)
      setLoading(false)

      // 记录浏览历史（已登录用户）
      const token = localStorage.getItem('token')
      if (token) {
        historyApi.addHistory(id, currentChapterId).catch(() => {})
      }
    }
  }, [id, currentChapterId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 获取当前章节索引
  const currentIndex = chapters.findIndex(c => c.id === currentChapterId)
  const currentChapter = chapters[currentIndex]

  // 切换章节
  const goToChapter = (chId: string) => {
    setCurrentChapterId(chId)
    navigate(`/comic/${id}/read/${chId}`, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToPrevChapter = () => {
    if (currentIndex > 0) {
      goToChapter(chapters[currentIndex - 1].id)
    }
  }

  const goToNextChapter = () => {
    if (currentIndex < chapters.length - 1) {
      goToChapter(chapters[currentIndex + 1].id)
    }
  }

  // 发送消息
  const sendMessage = () => {
    if (!chatInput.trim()) return

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: chatInput,
    }
    setMessages((prev) => [...prev, userMsg])
    setChatInput('')

    // 模拟AI回复
    setTimeout(() => {
      let reply = ''
      if (chatInput.includes('剧情') || chatInput.includes('总结')) {
        reply = `📖 ${currentChapter?.title || '当前章节'}剧情总结：\n\n主角在这一话中遇到了新的挑战，与伙伴们一起克服困难，展现了友情的力量。`
      } else if (chatInput.includes('人物') || chatInput.includes('角色')) {
        reply = '� 目$前出场的主要角色：\n\n• 主角 - 勇敢善良\n• 女主角 - 聪明机智\n• 导师 - 神秘的引路人'
      } else {
        reply = '好的，我记下了！还有什么想问的吗？💕'
      }

      const aiMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: reply,
      }
      setMessages((prev) => [...prev, aiMsg])
    }, 800)
  }

  return (
    <div className={`comic-reader ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* 顶部导航 */}
      <header className="reader-header">
        <button className="header-btn" onClick={() => navigate(`/comic/${id}`)}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <div className="header-title">
          <span>{currentChapter?.title || '加载中...'}</span>
        </div>
        <button
          className="header-btn sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <PanelRightClose size={20} strokeWidth={1.5} />
          ) : (
            <PanelRightOpen size={20} strokeWidth={1.5} />
          )}
        </button>
      </header>

      {/* 漫画内容区 - 使用 iframe 显示 PDF */}
      <main className="reader-content">
        <div className="comic-pages">
          {loading ? (
            <div className="loading-container">加载中...</div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="pdf-viewer"
              title="漫画阅读器"
            />
          ) : (
            <div className="loading-container">无法加载内容</div>
          )}
        </div>

        {/* 章节切换 */}
        <div className="chapter-nav">
          <button
            className="nav-btn"
            onClick={goToPrevChapter}
            disabled={currentIndex <= 0}
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
            上一话
          </button>
          <span className="chapter-info">
            {currentIndex + 1} / {chapters.length}
          </span>
          <button
            className="nav-btn"
            onClick={goToNextChapter}
            disabled={currentIndex >= chapters.length - 1}
          >
            下一话
            <ChevronRight size={20} strokeWidth={1.5} />
          </button>
        </div>
      </main>

      {/* 侧边栏 */}
      <aside className={`reader-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* 标签切换 */}
        <div className="sidebar-tabs">
          <button
            className={`tab ${activeTab === 'chapters' ? 'active' : ''}`}
            onClick={() => setActiveTab('chapters')}
          >
            <BookOpen size={16} strokeWidth={1.5} />
            章节
          </button>
          <button
            className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageCircle size={16} strokeWidth={1.5} />
            AI助手
          </button>
        </div>

        {/* 章节列表 */}
        {activeTab === 'chapters' && (
          <div className="sidebar-chapters">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                className={`chapter-btn ${chapter.id === currentChapterId ? 'active' : ''}`}
                onClick={() => goToChapter(chapter.id)}
              >
                {chapter.title}
              </button>
            ))}
          </div>
        )}

        {/* AI对话 */}
        {activeTab === 'chat' && (
          <div className="sidebar-chat">
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input">
              <input
                type="text"
                placeholder="问问AI助手..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>
                <Send size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* 侧边栏遮罩（移动端） */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}

export default ComicReader
