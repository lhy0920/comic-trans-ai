import { useState, useEffect, useCallback } from 'react'
import { CloudCheck, XCircle, AlertCircle, Info, X } from 'lucide-react'
import './Toast.css'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastProps {
  type: ToastType
  message: string
  onClose: () => void
}

// 单个 Toast 组件
function ToastItem({ type, message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const icons = {
    success: <CloudCheck size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
  }

  return (
    <div className={`toast-item toast-${type}`}>
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  )
}

// Toast 容器
let toastId = 0
let addToastFn: ((type: ToastType, message: string) => void) | null = null

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, type, message }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    addToastFn = addToast
    return () => { addToastFn = null }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

// 全局调用方法
export const toast = {
  success: (message: string) => addToastFn?.('success', message),
  error: (message: string) => addToastFn?.('error', message),
  warning: (message: string) => addToastFn?.('warning', message),
  info: (message: string) => addToastFn?.('info', message),
}

export default toast
