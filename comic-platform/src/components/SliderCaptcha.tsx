import { useState, useRef, useEffect } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import './SliderCaptcha.css'

interface SliderCaptchaProps {
    onSuccess: () => void
    onFail?: () => void
}

function SliderCaptcha({ onSuccess, onFail }: SliderCaptchaProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [sliderLeft, setSliderLeft] = useState(0)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isFailed, setIsFailed] = useState(false)
    const [targetPosition, setTargetPosition] = useState(0)
    
    const trackRef = useRef<HTMLDivElement>(null)
    const startXRef = useRef(0)

    // 生成随机目标位置 (60% - 85% 的位置)
    const generateTarget = () => {
        const min = 60
        const max = 85
        return Math.floor(Math.random() * (max - min + 1)) + min
    }

    useEffect(() => {
        setTargetPosition(generateTarget())
    }, [])

    // 重置验证
    const handleReset = () => {
        setSliderLeft(0)
        setIsSuccess(false)
        setIsFailed(false)
        setTargetPosition(generateTarget())
    }

    // 开始拖动
    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (isSuccess) return
        setIsDragging(true)
        setIsFailed(false)
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        startXRef.current = clientX - sliderLeft
    }

    // 拖动中
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !trackRef.current) return
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const trackWidth = trackRef.current.offsetWidth - 44 // 减去滑块宽度
        let newLeft = clientX - startXRef.current
        
        // 限制范围
        newLeft = Math.max(0, Math.min(newLeft, trackWidth))
        setSliderLeft(newLeft)
    }

    // 结束拖动
    const handleMouseUp = () => {
        if (!isDragging || !trackRef.current) return
        setIsDragging(false)
        
        const trackWidth = trackRef.current.offsetWidth - 44
        const currentPercent = (sliderLeft / trackWidth) * 100
        
        // 允许 3% 的误差
        if (Math.abs(currentPercent - targetPosition) <= 3) {
            setIsSuccess(true)
            onSuccess()
        } else {
            setIsFailed(true)
            onFail?.()
            // 失败后自动重置
            setTimeout(() => {
                setSliderLeft(0)
                setIsFailed(false)
            }, 500)
        }
    }

    // 绑定全局事件
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
            window.addEventListener('touchmove', handleMouseMove)
            window.addEventListener('touchend', handleMouseUp)
        }
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            window.removeEventListener('touchmove', handleMouseMove)
            window.removeEventListener('touchend', handleMouseUp)
        }
    }, [isDragging, sliderLeft])

    return (
        <div className={`slider-captcha ${isSuccess ? 'success' : ''} ${isFailed ? 'failed' : ''}`}>
            <div className="captcha-header">
                <span className="captcha-title">
                    {isSuccess ? '✓ 验证成功' : '请拖动滑块到指定位置'}
                </span>
                {!isSuccess && (
                    <button className="captcha-refresh" onClick={handleReset} type="button">
                        <RefreshCw size={14} />
                    </button>
                )}
            </div>
            
            <div className="captcha-track" ref={trackRef}>
                {/* 目标位置指示器 */}
                <div 
                    className="captcha-target"
                    style={{ left: `${targetPosition}%` }}
                />
                
                {/* 已滑动区域 */}
                <div 
                    className="captcha-progress"
                    style={{ width: sliderLeft + 22 }}
                />
                
                {/* 滑块 */}
                <div
                    className={`captcha-slider ${isDragging ? 'dragging' : ''}`}
                    style={{ left: sliderLeft }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                >
                    {isSuccess ? <Check size={18} /> : '→'}
                </div>
            </div>
            
            {isFailed && <p className="captcha-hint">未对准目标位置，请重试</p>}
        </div>
    )
}

export default SliderCaptcha
