/**
 * 格式化日期为相对时间（友好形式）
 * @param dateStr - 日期字符串
 * @returns 格式化后的相对时间字符串
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 个月前`
  return `${Math.floor(diffDays / 365)} 年前`
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
