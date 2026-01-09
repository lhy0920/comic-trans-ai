import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import './ReportModal.css'

interface ReportModalProps {
  type: 'post' | 'user'
  targetId: string
  targetName?: string
  onClose: () => void
  onSubmit: (reason: string, description: string) => Promise<void>
}

const REPORT_REASONS = {
  post: [
    '垃圾广告',
    '色情低俗',
    '政治敏感',
    '侵权内容',
    '人身攻击',
    '虚假信息',
    '其他'
  ],
  user: [
    '冒充他人',
    '发布违规内容',
    '骚扰行为',
    '垃圾营销',
    '未成年人保护',
    '其他'
  ]
}

function ReportModal({ type, targetId, targetName, onClose, onSubmit }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reasons = REPORT_REASONS[type]
  const title = type === 'post' ? '举报帖子' : '举报用户'

  const handleSubmit = async () => {
    if (!selectedReason) return
    
    setSubmitting(true)
    try {
      await onSubmit(selectedReason, description)
      onClose()
    } catch (error) {
      console.error('举报失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <div className="report-modal-header">
          <AlertTriangle size={20} className="report-icon" />
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {targetName && (
          <p className="report-target">
            {type === 'post' ? '帖子' : '用户'}：{targetName}
          </p>
        )}

        <div className="report-reasons">
          <p className="reasons-label">请选择举报原因：</p>
          {reasons.map(reason => (
            <label key={reason} className="reason-item">
              <input
                type="radio"
                name="reason"
                value={reason}
                checked={selectedReason === reason}
                onChange={e => setSelectedReason(e.target.value)}
              />
              <span>{reason}</span>
            </label>
          ))}
        </div>

        <div className="report-description">
          <label>补充说明（选填）：</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="请详细描述问题..."
            maxLength={500}
          />
          <span className="char-count">{description.length}/500</span>
        </div>

        <div className="report-actions">
          <button className="cancel-btn" onClick={onClose}>取消</button>
          <button 
            className="submit-btn" 
            onClick={handleSubmit}
            disabled={!selectedReason || submitting}
          >
            {submitting ? '提交中...' : '提交举报'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportModal
