import "./PublishPost.css"
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ImagePlus, X, Send, AtSign, Smile, Eye, EyeOff, Users, Check } from 'lucide-react'
import toast from '../components/Toast'
import { postApi, followApi, myPostApi, shortLinkApi } from '../services/api'

// 预设标签
const PRESET_TAGS = [
    '动漫讨论', '漫画推荐', '新番推荐', '追番日常',
    '同人创作', '原创绘画', '收藏分享', '漫展活动',
    '求推荐', '吐槽', '安利', '日常',
];

// 常用表情列表
const EMOJI_LIST = [
    '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆',
    '😉', '😊', '😋', '😎', '😍', '🥰', '😘', '😗',
    '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑',
    '😏', '😒', '🙄', '😬', '😮', '😯', '😲', '😳',
    '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
    '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱',
    '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️',
    '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖',
    '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
    '👍', '👎', '👏', '🙌', '🤝', '🙏', '✌️', '🤞',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔',
    '💯', '💢', '💥', '💫', '💦', '💨', '🔥', '✨',
];

interface FollowUser {
    id: string
    username: string
    nickname: string
    avatar: string
}

// 编辑模式的数据类型
interface EditModeState {
    editMode: boolean
    postId: string
    title: string
    content: string
    images: string[]
    tags: string[]
    visibility: 'public' | 'followers' | 'private'
}

// 图片类型：新上传的或已有的URL
interface ImageItem {
    type: 'file' | 'url'
    file?: File
    preview: string
    url?: string
}

function PublishPost() {
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // 获取编辑模式数据
    const editData = location.state as EditModeState | null;
    const isEditMode = editData?.editMode || false;
    
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [images, setImages] = useState<ImageItem[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 新增状态
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAtPicker, setShowAtPicker] = useState(false);
    const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
    const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
    const [followingUsers, setFollowingUsers] = useState<FollowUser[]>([]);
    const [atSearchText, setAtSearchText] = useState('');

    // 初始化编辑模式数据
    useEffect(() => {
        if (isEditMode && editData) {
            setTitle(editData.title || '');
            setContent(editData.content || '');
            setSelectedTags(editData.tags || []);
            setVisibility(editData.visibility || 'public');
            
            // 将已有图片URL转换为ImageItem
            if (editData.images && editData.images.length > 0) {
                const existingImages: ImageItem[] = editData.images.map(url => ({
                    type: 'url' as const,
                    preview: url,
                    url: url
                }));
                setImages(existingImages);
            }
        }
    }, [isEditMode, editData]);

    // 加载关注列表
    useEffect(() => {
        const loadFollowing = async () => {
            try {
                const data = await followApi.getFollowing();
                if (data.success) {
                    setFollowingUsers(data.users);
                }
            } catch (error) {
                console.error('加载关注列表失败:', error);
            }
        };
        loadFollowing();
    }, []);

    // 点击外部关闭弹窗
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.emoji-picker') && !target.closest('.emoji-btn')) {
                setShowEmojiPicker(false);
            }
            if (!target.closest('.at-picker') && !target.closest('.at-btn')) {
                setShowAtPicker(false);
            }
            if (!target.closest('.visibility-picker') && !target.closest('.visibility-btn')) {
                setShowVisibilityPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 插入表情
    const insertEmoji = (emoji: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent = content.slice(0, start) + emoji + content.slice(end);
            setContent(newContent);
            // 设置光标位置
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
                textarea.focus();
            }, 0);
        } else {
            setContent(content + emoji);
        }
    };

    // 插入@用户
    const insertAtUser = (user: FollowUser) => {
        const textarea = textareaRef.current;
        const atText = `@${user.nickname} `;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent = content.slice(0, start) + atText + content.slice(end);
            setContent(newContent);
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + atText.length;
                textarea.focus();
            }, 0);
        } else {
            setContent(content + atText);
        }
        setShowAtPicker(false);
        setAtSearchText('');
    };

    // 过滤关注用户
    const filteredUsers = followingUsers.filter(user => 
        user.nickname.toLowerCase().includes(atSearchText.toLowerCase()) ||
        user.username.toLowerCase().includes(atSearchText.toLowerCase())
    );

    // 自动转换内容中的链接为短链接
    const convertLinksInContent = async (text: string): Promise<string> => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = text.match(urlRegex) || [];
        // 过滤掉已经是短链接的URL（包含 /s/ 且长度较短）
        const longLinks = matches.filter(url => !url.includes('/s/') || url.length > 50);
        
        if (longLinks.length === 0) return text;
        
        try {
            const data = await shortLinkApi.batchCreate(longLinks);
            if (data.success && data.links) {
                let newContent = text;
                data.links.forEach((link: { original: string; short: string }) => {
                    newContent = newContent.replace(link.original, link.short);
                });
                return newContent;
            }
        } catch (error) {
            console.error('链接转换失败:', error);
        }
        return text;
    };

    // 获取可见性文本
    const getVisibilityText = () => {
        switch (visibility) {
            case 'public': return '公开';
            case 'followers': return '仅粉丝';
            case 'private': return '仅自己';
        }
    };

    // 获取可见性图标
    const getVisibilityIcon = () => {
        switch (visibility) {
            case 'public': return <Eye size={16} strokeWidth={2} />;
            case 'followers': return <Users size={16} strokeWidth={2} />;
            case 'private': return <EyeOff size={16} strokeWidth={2} />;
        }
    };

    // 选择图片
    const handleSelectImages = () => {
        fileInputRef.current?.click();
    };

    // 处理图片选择
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newImages: ImageItem[] = [];
        const maxImages = 9;
        const remaining = maxImages - images.length;

        Array.from(files).slice(0, remaining).forEach(file => {
            if (file.type.startsWith('image/')) {
                newImages.push({
                    type: 'file',
                    file,
                    preview: URL.createObjectURL(file)
                });
            }
        });

        if (newImages.length > 0) {
            setImages([...images, ...newImages]);
        }

        e.target.value = '';
    };

    // 删除图片
    const handleRemoveImage = (index: number) => {
        const newImages = [...images];
        const removed = newImages[index];
        // 只有新上传的文件才需要释放 URL
        if (removed.type === 'file') {
            URL.revokeObjectURL(removed.preview);
        }
        newImages.splice(index, 1);
        setImages(newImages);
    };

    // 切换标签选择
    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else if (selectedTags.length < 3) {
            setSelectedTags([...selectedTags, tag]);
        } else {
            toast.warning('最多选择3个标签');
        }
    };

    // 发布或更新帖子
    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.warning('请输入标题');
            return;
        }

        if (!content.trim()) {
            toast.warning('请输入内容');
            return;
        }

        setIsSubmitting(true);

        try {
            // 自动转换内容中的链接为短链接
            const processedContent = await convertLinksInContent(content.trim());
            
            if (isEditMode && editData) {
                // 编辑模式：更新帖子
                const newImageFiles = images.filter(img => img.type === 'file').map(img => img.file!);
                const existingImageUrls = images.filter(img => img.type === 'url').map(img => img.url!);
                
                await myPostApi.updatePostWithImages(
                    editData.postId,
                    title.trim(),
                    processedContent, 
                    selectedTags, 
                    visibility,
                    newImageFiles,
                    existingImageUrls
                );
                
                toast.success('修改成功！');
                navigate('/myposts');
            } else {
                // 新建模式：发布帖子
                const imageFiles = images.filter(img => img.type === 'file').map(img => img.file!);
                await postApi.createPost(title.trim(), processedContent, imageFiles, selectedTags, visibility);
                
                toast.success('发布成功！');
                navigate('/community');
            }
            
            // 清理预览 URL
            images.forEach(img => {
                if (img.type === 'file') {
                    URL.revokeObjectURL(img.preview);
                }
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : (isEditMode ? '修改失败' : '发布失败，请重试'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // 返回
    const handleBack = () => {
        if (title.trim() || content.trim() || images.length > 0) {
            if (window.confirm('确定要放弃编辑吗？')) {
                images.forEach(img => {
                    if (img.type === 'file') {
                        URL.revokeObjectURL(img.preview);
                    }
                });
                navigate(-1);
            }
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="publish-post-page">
            {/* 顶部导航 */}
            <header className="publish-header">
                <button className="back-btn" onClick={handleBack}>
                    <ArrowLeft size={20} strokeWidth={1.5} />
                </button>
                <h1 style={{marginLeft:'40px'}}>{isEditMode ? '编辑帖子' : '发布帖子'}</h1>
                <button 
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !title.trim() || !content.trim()}
                >
                    {isSubmitting ? (isEditMode ? '保存中...' : '发布中...') : (isEditMode ? '保存' : '发布')}
                    {!isSubmitting && <Send size={16} strokeWidth={1.5} />}
                </button>
            </header>

            {/* 内容区 */}
            <main className="publish-content">
                {/* 标题输入 */}
                <div className="title-input-section">
                    <input
                        type="text"
                        className="title-input"
                        placeholder="请输入标题（必填）"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={100}
                    />
                    <span className="title-count">{title.length}/100</span>
                </div>

                {/* 文字输入 */}
                <div className="content-input-section">
                    <textarea
                        ref={textareaRef}
                        className="content-textarea"
                        placeholder="分享你的想法..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={1000}
                    />
                    <div className="content-footer">
                        <div className="icon-group">
                            {/* 表情按钮 */}
                            <div className="icon-wrapper">
                                <button 
                                    className={`icon-btn emoji-btn ${showEmojiPicker ? 'active' : ''}`}
                                    onClick={() => {
                                        setShowEmojiPicker(!showEmojiPicker);
                                        setShowAtPicker(false);
                                        setShowVisibilityPicker(false);
                                    }}
                                >
                                    <Smile size={18} strokeWidth={2}/>
                                </button>
                                {showEmojiPicker && (
                                    <div className="emoji-picker">
                                        <div className="emoji-grid">
                                            {EMOJI_LIST.map((emoji, index) => (
                                                <button 
                                                    key={index} 
                                                    className="emoji-item"
                                                    onClick={() => insertEmoji(emoji)}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* @按钮 */}
                            <div className="icon-wrapper">
                                <button 
                                    className={`icon-btn at-btn ${showAtPicker ? 'active' : ''}`}
                                    onClick={() => {
                                        setShowAtPicker(!showAtPicker);
                                        setShowEmojiPicker(false);
                                        setShowVisibilityPicker(false);
                                    }}
                                >
                                    <AtSign size={18} strokeWidth={2} />
                                </button>
                                {showAtPicker && (
                                    <div className="at-picker">
                                        <input 
                                            type="text"
                                            className="at-search"
                                            placeholder="搜索关注的人..."
                                            value={atSearchText}
                                            onChange={(e) => setAtSearchText(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="at-list">
                                            {filteredUsers.length === 0 ? (
                                                <div className="at-empty">
                                                    {followingUsers.length === 0 ? '还没有关注任何人' : '没有找到匹配的用户'}
                                                </div>
                                            ) : (
                                                filteredUsers.map(user => (
                                                    <button 
                                                        key={user.id} 
                                                        className="at-user-item"
                                                        onClick={() => insertAtUser(user)}
                                                    >
                                                        <img 
                                                            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                                                            alt={user.nickname}
                                                            className="at-user-avatar"
                                                        />
                                                        <span className="at-user-name">{user.nickname}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 可见性按钮 */}
                            <div className="icon-wrapper">
                                <button 
                                    className={`icon-btn visibility-btn ${showVisibilityPicker ? 'active' : ''}`}
                                    onClick={() => {
                                        setShowVisibilityPicker(!showVisibilityPicker);
                                        setShowEmojiPicker(false);
                                        setShowAtPicker(false);
                                    }}
                                >
                                    {/* {getVisibilityIcon()} */}
                                    <span className="visibility-text">{getVisibilityText()}</span>
                                </button>
                                {showVisibilityPicker && (
                                    <div className="visibility-picker">
                                        <button 
                                            className={`visibility-option ${visibility === 'public' ? 'active' : ''}`}
                                            onClick={() => { setVisibility('public'); setShowVisibilityPicker(false); }}
                                        >
                                            <Eye size={18} />
                                            <div className="visibility-option-info">
                                                <span className="visibility-option-title">公开</span>
                                                <span className="visibility-option-desc">所有人可见</span>
                                            </div>
                                            {visibility === 'public' && <Check size={18} className="check-icon" />}
                                        </button>
                                        <button 
                                            className={`visibility-option ${visibility === 'followers' ? 'active' : ''}`}
                                            onClick={() => { setVisibility('followers'); setShowVisibilityPicker(false); }}
                                        >
                                            <Users size={18} />
                                            <div className="visibility-option-info">
                                                <span className="visibility-option-title">仅粉丝可见</span>
                                                <span className="visibility-option-desc">只有关注你的人可见</span>
                                            </div>
                                            {visibility === 'followers' && <Check size={18} className="check-icon" />}
                                        </button>
                                        <button 
                                            className={`visibility-option ${visibility === 'private' ? 'active' : ''}`}
                                            onClick={() => { setVisibility('private'); setShowVisibilityPicker(false); }}
                                        >
                                            <EyeOff size={18} />
                                            <div className="visibility-option-info">
                                                <span className="visibility-option-title">仅自己可见</span>
                                                <span className="visibility-option-desc">只有自己可以看到</span>
                                            </div>
                                            {visibility === 'private' && <Check size={18} className="check-icon" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <span className="content-count">{content.length}/1000</span>
                    </div>
                </div>

                {/* 图片上传 */}
                <div className="images-section">
                    <div className="images-grid">
                        {images.map((img, index) => (
                            <div key={index} className="image-item">
                                <img src={img.preview} alt={`图片${index + 1}`} />
                                <button 
                                    className="remove-image-btn"
                                    onClick={() => handleRemoveImage(index)}
                                >
                                    <X size={14} strokeWidth={2} />
                                </button>
                            </div>
                        ))}
                        {images.length < 9 && (
                            <button className="add-image-btn" onClick={handleSelectImages}>
                                <ImagePlus size={28} strokeWidth={1.5} />
                                <span>添加图片</span>
                            </button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                    />
                    <p className="images-tip">最多上传9张图片</p>
                </div>

                {/* 标签选择 */}
                <div className="tags-section">
                    <h3 className="section-title">选择标签 <span className="tag-count">({selectedTags.length}/3)</span></h3>
                    <div className="tags-grid">
                        {PRESET_TAGS.map(tag => (
                            <button
                                key={tag}
                                className={`tag-btn ${selectedTags.includes(tag) ? 'selected' : ''}`}
                                onClick={() => toggleTag(tag)}
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}

export default PublishPost
