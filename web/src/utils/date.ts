export type DateFormatLocale = 'zh' | 'en'

/**
 * 相对时间：24 小时内用秒/分/小时，避免「今天」掩盖真实间隔
 */
export function formatDate(
  dateStr: string | null | undefined,
  locale: DateFormatLocale = 'zh'
): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 0) {
    return locale === 'zh' ? '刚刚' : 'just now'
  }

  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) {
    if (sec < 1) return locale === 'zh' ? '刚刚' : 'just now'
    return locale === 'zh' ? `${sec} 秒前` : `${sec}s ago`
  }

  const min = Math.floor(diffMs / (1000 * 60))
  if (min < 60) {
    return locale === 'zh' ? `${min} 分钟前` : `${min} min ago`
  }

  const hour = Math.floor(diffMs / (1000 * 60 * 60))
  if (hour < 24) {
    return locale === 'zh' ? `${hour} 小时前` : `${hour} hr ago`
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 1) return locale === 'zh' ? '昨天' : 'yesterday'
  if (diffDays < 7) return locale === 'zh' ? `${diffDays} 天前` : `${diffDays} days ago`
  if (diffDays < 30) {
    const w = Math.floor(diffDays / 7)
    if (locale === 'zh') return `${w} 周前`
    return w === 1 ? '1 week ago' : `${w} weeks ago`
  }
  if (diffDays < 365) {
    const m = Math.floor(diffDays / 30)
    if (locale === 'zh') return `${m} 个月前`
    return m === 1 ? '1 month ago' : `${m} months ago`
  }
  const y = Math.floor(diffDays / 365)
  if (locale === 'zh') return `${y} 年前`
  return y === 1 ? '1 year ago' : `${y} years ago`
}

/**
 * 格式化日期为完整格式
 * @param dateStr - 日期字符串
 * @returns 格式化后的完整日期字符串
 */
export function formatDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
