/**
 * Skill Base - Lightweight i18n Composable
 * Based on static/js/i18n.js
 */
import { ref, computed } from 'vue'

// Translation tables from static/js/i18n.js
const zh: Record<string, string> = {
  // Navbar
  'nav.home': '首页',
  'nav.publish': '发布',
  'nav.settings': '账户设置',
  'nav.admin': '用户管理',
  'nav.logout': '登出',
  'nav.login': '登录',

  // Common buttons / labels
  'btn.cancel': '取消',
  'btn.save': '保存修改',
  'btn.add': '添加',
  'btn.edit': '编辑',
  'btn.delete': '删除',
  'btn.confirm': '确认删除',
  'btn.remove': '移除',
  'btn.close': '关闭',
  'btn.reset': '确认重置',
  'btn.back': '返回详情页',

  // Time (formatDate)
  'time.justNow': '刚刚',
  'time.minutesAgo': '分钟前',
  'time.hoursAgo': '小时前',
  'time.daysAgo': '天前',

  // Common states
  'state.loading': '加载中...',
  'state.noDesc': '暂无描述',
  'state.unknown': '未知',
  'state.noData': '暂无数据',
  'state.empty': '空目录',

  // Login page
  'login.title': '登录 - Skill Base',
  'login.subtitle': '// 内网 Skill 管理平台 · 需要凭证',
  'login.submit': '执行登录',
  'login.loading': '登录中...',
  'login.errUsername': '请输入用户名',
  'login.errPassword': '请输入密码',
  'login.errFailed': '登录失败，请重试',
  'login.unauthorized': '未授权，请重新登录',

  // Setup page (initial admin setup)
  'setup.title': '初始化 - Skill Base',
  'setup.subtitle': '// 首次启动 · 请设置管理员账号',
  'setup.usernameHint': '3-50 个字符',
  'setup.passwordHint': '至少 6 个字符',
  'setup.submit': '创建管理员账号',
  'setup.loading': '创建中...',
  'setup.success': '管理员账号创建成功，即将跳转到登录页...',
  'setup.errUsername': '请输入用户名',
  'setup.errUsernameLength': '用户名需要 3-50 个字符',
  'setup.errPassword': '请输入密码',
  'setup.errPasswordLength': '密码至少需要 6 个字符',
  'setup.errPasswordMismatch': '两次输入的密码不一致',
  'setup.errFailed': '创建失败，请重试',

  // Index page
  'index.searchPlaceholder': '搜索 Skill...',
  'index.fabTitle': '发布新版本',
  'index.noSkills': '暂无 Skill，去发布第一个吧',
  'index.noResults': '未找到包含 "{q}" 的 Skill',
  'index.noResultsHint': '试试其他关键词？',
  'index.publishBtn': '发布 Skill',
  'index.loadFailed': '加载失败: ',

  // Settings page
  'settings.title': '账户设置 - Skill Base',
  'settings.heading': '账户设置',
  'settings.subtitle': '// 管理您的个人信息和凭证',
  'settings.basicInfo': '基本信息',
  'settings.usernameLabel': '用户名',
  'settings.usernameHint': '// 用户名不可修改',
  'settings.nameLabel': '姓名',
  'settings.namePlaceholder': '请输入您的姓名',
  'settings.nameHint': '// 可选，用于显示在技能作者信息中',
  'settings.saveBtn': '保存修改',
  'settings.saving': '保存中...',
  'settings.saveSuccess': '保存成功',
  'settings.saveFailed': '保存失败',
  'settings.cliSection': 'CLI 访问凭证',
  'settings.cliDesc': '// 在本地终端使用 <code>skb</code> 命令行工具时，需要获取验证码进行登录。',
  'settings.cliLink': '获取 CLI 验证码',
  'settings.passwordSection': '修改密码',
  'settings.oldPassword': '当前密码',
  'settings.newPassword': '新密码',
  'settings.newPasswordHint': '// 至少 6 个字符',
  'settings.confirmPassword': '确认新密码',
  'settings.changePasswordBtn': '修改密码',
  'settings.changing': '修改中...',
  'settings.loadFailed': '加载用户信息失败',
  'settings.usernameLenError': '用户名长度必须在 1-50 个字符之间',
  'settings.updateSuccess': '个人信息已更新',
  'settings.updateFailed': '更新失败',
  'settings.noOldPassword': '请输入当前密码',
  'settings.newPassTooShort': '新密码长度至少 6 位',
  'settings.passMismatch': '两次输入的新密码不一致',
  'settings.changeSuccess': '密码修改成功',
  'settings.changeFailed': '修改失败',
  'settings.wrongPassword': '当前密码错误',

  // Admin page
  'admin.heading': '用户管理',
  'admin.subtitle': '// 管理平台用户信息和权限控制',
  'admin.userList': '用户列表',
  'admin.addUser': '添加用户',
  'admin.searchPlaceholder': '搜索用户名...',
  'admin.allStatus': '全部状态',
  'admin.active': '启用',
  'admin.disabled': '禁用',
  'admin.thUsername': '用户名',
  'admin.thName': '姓名',
  'admin.thRole': '角色',
  'admin.thStatus': '状态',
  'admin.thCreatedAt': '创建时间',
  'admin.thActions': '操作',
  'admin.emptyState': '暂无用户数据',
  'admin.prevPage': '上一页',
  'admin.nextPage': '下一页',
  'admin.addModal': '添加用户',
  'admin.editModal': '编辑用户',
  'admin.roleLabel': '角色',
  'admin.roleAdmin': '管理员',
  'admin.roleUser': '普通用户',
  'admin.statusLabel': '账户状态',
  'admin.statusActive': '账户已启用',
  'admin.statusDisabled': '账户已禁用',
  'admin.resetPassword': '重置密码',
  'admin.resetPasswordHint': '为用户设置新密码',
  'admin.doReset': '重置',
  'admin.cancelReset': '取消重置',
  'admin.newPasswordPlaceholder': '输入新密码',
  'admin.cancel': '取消',
  'admin.confirmAdd': '确认添加',
  'admin.confirmSave': '保存修改',
  'admin.editUser': '编辑用户',
  'admin.fetchError': '获取用户列表失败',
  'admin.addSuccess': '用户添加成功',
  'admin.addError': '添加用户失败',
  'admin.editSuccess': '用户信息已更新',
  'admin.editError': '更新用户失败',
}

const en: Record<string, string> = {
  // Navbar
  'nav.home': 'Home',
  'nav.publish': 'Publish',
  'nav.settings': 'Account Settings',
  'nav.admin': 'User Management',
  'nav.logout': 'Sign Out',
  'nav.login': 'Sign In',

  // Common buttons / labels
  'btn.cancel': 'Cancel',
  'btn.save': 'Save Changes',
  'btn.add': 'Add',
  'btn.edit': 'Edit',
  'btn.delete': 'Delete',
  'btn.confirm': 'Confirm Delete',
  'btn.remove': 'Remove',
  'btn.close': 'Close',
  'btn.reset': 'Confirm Reset',
  'btn.back': 'Back to Detail',

  // Time (formatDate)
  'time.justNow': 'just now',
  'time.minutesAgo': ' min ago',
  'time.hoursAgo': ' hr ago',
  'time.daysAgo': ' days ago',

  // Common states
  'state.loading': 'Loading...',
  'state.noDesc': 'No description',
  'state.unknown': 'Unknown',
  'state.noData': 'No data',
  'state.empty': 'Empty directory',

  // Login page
  'login.title': 'Sign In - Skill Base',
  'login.subtitle': '// Internal Skill Platform · Credentials Required',
  'login.submit': 'Sign In',
  'login.loading': 'Signing in...',
  'login.errUsername': 'Please enter your username',
  'login.errPassword': 'Please enter your password',
  'login.errFailed': 'Login failed, please try again',
  'login.unauthorized': 'Unauthorized, please sign in again',

  // Setup page (initial admin setup)
  'setup.title': 'Initial Setup - Skill Base',
  'setup.subtitle': '// First Launch · Create Admin Account',
  'setup.usernameHint': '3-50 characters',
  'setup.passwordHint': 'At least 6 characters',
  'setup.submit': 'Create Admin Account',
  'setup.loading': 'Creating...',
  'setup.success': 'Admin account created successfully, redirecting to login...',
  'setup.errUsername': 'Please enter a username',
  'setup.errUsernameLength': 'Username must be 3-50 characters',
  'setup.errPassword': 'Please enter a password',
  'setup.errPasswordLength': 'Password must be at least 6 characters',
  'setup.errPasswordMismatch': 'Passwords do not match',
  'setup.errFailed': 'Setup failed, please try again',

  // Index page
  'index.searchPlaceholder': 'Search skills...',
  'index.fabTitle': 'Publish New Version',
  'index.noSkills': 'No skills yet, publish the first one',
  'index.noResults': 'No skills found for "{q}"',
  'index.noResultsHint': 'Try a different keyword?',
  'index.publishBtn': 'Publish Skill',
  'index.loadFailed': 'Load failed: ',

  // Settings page
  'settings.title': 'Account Settings - Skill Base',
  'settings.heading': 'Account Settings',
  'settings.subtitle': '// Manage your personal info and credentials',
  'settings.basicInfo': 'Basic Info',
  'settings.usernameLabel': 'Username',
  'settings.usernameHint': '// Username cannot be changed',
  'settings.nameLabel': 'Name',
  'settings.namePlaceholder': 'Enter your name',
  'settings.nameHint': '// Optional, displayed as skill author',
  'settings.saveBtn': 'Save Changes',
  'settings.saving': 'Saving...',
  'settings.saveSuccess': 'Saved successfully',
  'settings.saveFailed': 'Failed to save',
  'settings.cliSection': 'CLI Access',
  'settings.cliDesc': '// Get verification code to login with <code>skb</code> CLI tool.',
  'settings.cliLink': 'Get CLI Code',
  'settings.passwordSection': 'Change Password',
  'settings.oldPassword': 'Current Password',
  'settings.newPassword': 'New Password',
  'settings.newPasswordHint': '// At least 6 characters',
  'settings.confirmPassword': 'Confirm New Password',
  'settings.changePasswordBtn': 'Change Password',
  'settings.changing': 'Changing...',
  'settings.loadFailed': 'Failed to load user info',
  'settings.usernameLenError': 'Username must be 1-50 characters',
  'settings.updateSuccess': 'Profile updated',
  'settings.updateFailed': 'Update failed',
  'settings.noOldPassword': 'Please enter current password',
  'settings.newPassTooShort': 'New password must be at least 6 characters',
  'settings.passMismatch': 'Passwords do not match',
  'settings.changeSuccess': 'Password changed successfully',
  'settings.changeFailed': 'Failed to change password',
  'settings.wrongPassword': 'Current password is incorrect',

  // Admin page
  'admin.heading': 'User Management',
  'admin.subtitle': '// Manage platform users and permissions',
  'admin.userList': 'User List',
  'admin.addUser': 'Add User',
  'admin.searchPlaceholder': 'Search username...',
  'admin.allStatus': 'All Status',
  'admin.active': 'Active',
  'admin.disabled': 'Disabled',
  'admin.thUsername': 'Username',
  'admin.thName': 'Name',
  'admin.thRole': 'Role',
  'admin.thStatus': 'Status',
  'admin.thCreatedAt': 'Created At',
  'admin.thActions': 'Actions',
  'admin.emptyState': 'No user data',
  'admin.prevPage': 'Previous',
  'admin.nextPage': 'Next',
  'admin.addModal': 'Add User',
  'admin.editModal': 'Edit User',
  'admin.roleLabel': 'Role',
  'admin.roleAdmin': 'Admin',
  'admin.roleUser': 'User',
  'admin.statusLabel': 'Account Status',
  'admin.statusActive': 'Account is active',
  'admin.statusDisabled': 'Account is disabled',
  'admin.resetPassword': 'Reset Password',
  'admin.resetPasswordHint': 'Set a new password for user',
  'admin.doReset': 'Reset',
  'admin.cancelReset': 'Cancel',
  'admin.newPasswordPlaceholder': 'Enter new password',
  'admin.cancel': 'Cancel',
  'admin.confirmAdd': 'Confirm Add',
  'admin.confirmSave': 'Save Changes',
  'admin.editUser': 'Edit User',
  'admin.fetchError': 'Failed to fetch users',
  'admin.addSuccess': 'User added successfully',
  'admin.addError': 'Failed to add user',
  'admin.editSuccess': 'User updated successfully',
  'admin.editError': 'Failed to update user',
}

// Language detection - same as static/js/i18n.js
const _storedLang = localStorage.getItem('skb-lang')
let isChinese: boolean
if (_storedLang === 'zh' || _storedLang === 'en') {
  isChinese = _storedLang === 'zh'
} else {
  const _browserLang = (navigator.language || (navigator as any).languages?.[0] || 'en').toLowerCase()
  isChinese = _browserLang.startsWith('zh')
}

const currentLang = ref(isChinese ? 'zh' : 'en')

export function useI18n() {
  const t = (key: string): string => {
    const translations = currentLang.value === 'zh' ? zh : en
    return translations[key] || key
  }

  const setLang = (lang: 'zh' | 'en') => {
    currentLang.value = lang
    localStorage.setItem('skb-lang', lang)
    // Reload page to apply translations like static/js/i18n.js
    window.location.reload()
  }

  return {
    t,
    currentLang: computed(() => currentLang.value),
    setLang,
  }
}
