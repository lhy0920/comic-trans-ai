import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ message: '请先登录' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ message: 'token无效' })
  }
}
