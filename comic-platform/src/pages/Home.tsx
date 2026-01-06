import { useState, useRef, useEffect } from 'react'
import { Send, TrendingUp, Star, } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PdfCover from '../components/PdfCover'
import './Home.css'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

interface Comic {
  id: string
  title: string
  author: string
  description: string
  cover: string
  tags: string[]
  rating: number
  status: string
}

function Home() {
  const navigate = useNavigate()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [chatInput, setChatInput] = useState('')
  const [comics, setComics] = useState<Comic[]>([])
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content:
        '你好呀～✨ 我是你的漫画小助手！想看什么类型的漫画？或者让我给你推荐几部好看的？喵喵喵~~',
    },
  ])

  // 加载漫画列表
  useEffect(() => {
    const loadComics = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/comics/local/list')
        const data = await res.json()
        if (data.success) {
          // 处理 tags（后端返回的是空格分隔的字符串）
          const processedComics = data.comics.map((c: Comic & {tags: string | string[]}) => ({
            ...c,
            tags: typeof c.tags === 'string' ? c.tags.split(' ') : c.tags
          }))
          setComics(processedComics)
        }
      } catch (error) {
        console.error('加载漫画失败:', error)
      }
    }
    loadComics()
  }, [])

  useEffect(() => {
    // chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
     if (messages.length > 1) {
    chatEndRef.current?.scrollIntoView({ 
      behavior: 'smooth' ,
      block: 'center'
    })
  }
  }, [messages])

  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async () => {
    if (!chatInput.trim() || isLoading) return

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: chatInput,
    }
    setMessages((prev) => [...prev, userMsg])
    const messageText = chatInput
    setChatInput('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        })
      })

      const data = await response.json()
      
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.reply || '抱歉，我遇到了一些问题，请稍后再试～',
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (error) {
      console.error('Chat error:', error)
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '网络好像有点问题，稍后再试试吧～💦',
      }
      setMessages((prev) => [...prev, aiMsg])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="home-page">
      {/* 主标题 */}
      <section className="hero-section">
        <h1 className="hero-title">今天想看点什么？</h1>
        <p className="hero-subtitle">让 AI 帮你找到喜欢的漫画 ✨</p>
      </section>

      {/* AI 对话区 */}
      <section className="chat-section">
        <div className="chat-box">
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-wrapper">
            <input
              type="text"
              placeholder={isLoading ? "思考中..." : "告诉我你想看什么类型的漫画..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading}
            />
            <button onClick={sendMessage} disabled={isLoading}>
              {isLoading ? (
                <div className="loading-dot" />
              ) : (
                <Send size={18} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 漫画推荐 */}
      <section className="topic-section">
        <div className="section-header">
          <h2>
            <TrendingUp size={20} strokeWidth={1.5} />
            漫画推荐
          </h2>
        </div>
        <div className="comic-scroll">
          {comics.map((comic) => (
            <div
              key={comic.id}
              className="comic-card-small"
              onClick={() => navigate(`/comic/${comic.id}`)}
            >
              <div className="card-cover">
                <PdfCover 
                  pdfUrl={`http://localhost:5000/api/comics/local/${comic.id}/chapter/1`}
                  alt={comic.title}
                  fallback="https://picsum.photos/seed/comic/400/600"
                />
                <span className="rating-badge">
                  <Star size={10} fill="currentColor" />
                  {comic.rating}
                </span>
              </div>
              <p className="card-title">{comic.title}</p>
              <div className="card-tags">
                {comic.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="mini-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home
