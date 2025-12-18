import express from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { connectDB } from './config/db'
import authRoutes from './routes/auth'
import comicRoutes from './routes/comic'
import uploadRoutes from './routes/upload'
import chatRoutes from './routes/chat'
import translateRoutes from './routes/translate'
import collectionRoutes from './routes/collection'
import historyRoutes from './routes/history'

dotenv.config()

const app = express()

// 中间件
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/comics', comicRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/translate', translateRoutes)
app.use('/api/collections', collectionRoutes)
app.use('/api/history', historyRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 启动服务
const PORT = process.env.PORT || 5000

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
})

export default app
