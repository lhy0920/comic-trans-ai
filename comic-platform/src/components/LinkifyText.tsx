import React from 'react'

interface LinkifyTextProps {
    text: string
    className?: string
}

/**
 * 将文本中的链接转换为可点击的 <a> 标签
 */
function LinkifyText({ text, className }: LinkifyTextProps) {
    // 匹配 URL 的正则表达式
    const urlRegex = /(https?:\/\/[^\s]+)/g
    
    // 分割文本，保留链接
    const parts = text.split(urlRegex)
    
    return (
        <span className={className}>
            {parts.map((part, index) => {
                // 检查这部分是否是 URL
                if (urlRegex.test(part)) {
                    // 重置正则的 lastIndex
                    urlRegex.lastIndex = 0
                    return (
                        <a
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="linkify-link"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part.length > 50 ? part.slice(0, 50) + '...' : part}
                        </a>
                    )
                }
                // 重置正则的 lastIndex
                urlRegex.lastIndex = 0
                return <React.Fragment key={index}>{part}</React.Fragment>
            })}
        </span>
    )
}

export default LinkifyText
