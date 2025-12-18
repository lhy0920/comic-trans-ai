import { useState, useRef, useCallback } from 'react'
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Check, Upload, RotateCw } from 'lucide-react'
import './AvatarUpload.css'

interface AvatarUploadProps {
  currentAvatar: string
  onSave: (avatarBlob: Blob) => void
  onClose: () => void
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
  return centerCrop(
    makeAspectCrop(
      { unit: '%', width: 70 },
      1,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  )
}

function AvatarUpload({ currentAvatar, onSave, onClose }: AvatarUploadProps) {
  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = () => {
        setImgSrc(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget
      const crop = centerAspectCrop(naturalWidth, naturalHeight)
      setCrop(crop)
    },
    []
  )

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    const image = imgRef.current
    if (!image || !completedCrop) return null

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    const pixelCrop = {
      x: completedCrop.x * scaleX,
      y: completedCrop.y * scaleY,
      width: completedCrop.width * scaleX,
      height: completedCrop.height * scaleY,
    }

    canvas.width = 200
    canvas.height = 200

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      200,
      200
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9)
    })
  }, [completedCrop])

  const handleSave = async () => {
    const blob = await getCroppedImg()
    if (blob) {
      onSave(blob)
    }
  }

  return (
    <div className="avatar-upload-modal">
      <div className="avatar-upload-overlay" onClick={onClose} />
      <div className="avatar-upload-content">
        <div className="avatar-upload-header">
          <h3>更换头像</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="avatar-upload-body">
          {!imgSrc ? (
            <div
              className="upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onSelectFile}
                hidden
              />
              <div className="current-avatar">
                <img src={currentAvatar} alt="当前头像" />
              </div>
              <div className="upload-hint">
                <Upload size={24} strokeWidth={1.5} />
                <p>点击上传新头像</p>
                <span>支持 JPG、PNG 格式</span>
              </div>
            </div>
          ) : (
            <div className="crop-area">
              <div className="crop-container">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt="裁剪预览"
                    onLoad={onImageLoad}
                    style={{ maxHeight: '300px', maxWidth: '100%' }}
                  />
                </ReactCrop>
              </div>
              <div className="crop-tools">
                <button
                  className="tool-btn"
                  onClick={() => {
                    setImgSrc('')
                    setCrop(undefined)
                  }}
                >
                  <RotateCw size={18} strokeWidth={1.5} />
                  重选
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="avatar-upload-footer">
          <button className="cancel-btn" onClick={onClose}>
            取消
          </button>
          <button className="save-btn" onClick={handleSave} disabled={!imgSrc}>
            <Check size={18} strokeWidth={1.5} />
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

export default AvatarUpload
