/**
 * Skill Base - i18n Internationalization Module
 * Detects browser language and provides translations.
 * Chinese (zh-*) users get Chinese; all others get English (default).
 *
 * Usage:
 *   t('key')              - get translated string
 *   applyI18n()           - apply data-i18n attributes to DOM
 *   applyI18nPlaceholders() - apply data-i18n-placeholder attributes
 */

(function () {
  'use strict';

  // ── Language detection ──────────────────────────────────────────────────────
  // Priority: localStorage (user preference) > browser language
  const _storedLang = localStorage.getItem('skb-lang');
  let isChinese;
  if (_storedLang === 'zh' || _storedLang === 'en') {
    isChinese = _storedLang === 'zh';
  } else {
    const _browserLang = (navigator.language || navigator.languages?.[0] || 'en').toLowerCase();
    isChinese = _browserLang.startsWith('zh');
  }

  // ── Translation tables ───────────────────────────────────────────────────────
  const zh = {
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

    // Skill detail page
    'skill.title': 'Skill 详情 - Skill Base',
    'skill.breadcrumbHome': '首页',
    'skill.loading': '加载中...',
    'skill.fileDir': '文件目录',
    'skill.selectFile': '选择文件以预览',
    'skill.clickFile': '点击左侧文件查看内容',
    'skill.htmlPreview': 'HTML 预览',
    'skill.mdSource': 'Markdown 源码',
    'skill.team': '管理团队',
    'skill.addCollaborator': '+ 添加协作者',
    'skill.deleteSkill': '删除 Skill',
    'skill.versionHistory': '版本历史',
    'skill.noVersions': '暂无版本记录',
    'skill.owner': '负责人: ',
    'skill.createdAt': '创建时间: ',
    'skill.uploadedBy': '上传者: ',
    'skill.noChangelog': '无更新说明',
    'skill.selectVersion': '选择版本...',
    'skill.latestTag': '(最新)',
    'skill.download': '下载当前版本',
    'skill.compare': '对比版本',
    'skill.selectVersionFirst': '请先选择版本',
    'skill.fileNotFound': '文件不存在',
    'skill.binaryFile': '二进制文件，无法预览',
    'skill.binaryHint': '请下载 zip 包后在本地查看',
    'skill.previewFailed': '预览失败: ',
    'skill.loadFailed': '加载 Skill 详情失败',
    'skill.missingId': '缺少 Skill ID 参数',
    'skill.loadVersionsFailed': '加载版本列表失败',
    'skill.zipFailed': '下载 zip 失败',
    'skill.versionFailed': '加载版本失败: ',
    'skill.infoLoading': 'Skill 信息加载中',
    'skill.needTwoVersions': '至少需要两个版本才能对比',
    'skill.loadInfoFailed': '加载 Skill 信息失败',

    // Collaborators
    'collab.modal': '添加协作者',
    'collab.usernameLabel': '用户名',
    'collab.usernamePlaceholder': '输入用户名',
    'collab.owner': '所有者',
    'collab.collaborator': '协作者',
    'collab.disabled': ' (已禁用)',
    'collab.noUsers': '未找到用户',
    'collab.enterUsername': '请输入用户名',
    'collab.addSuccess': '协作者添加成功',
    'collab.addFailed': '添加失败',
    'collab.removeConfirm': '确定要移除该协作者吗？',
    'collab.removeSuccess': '协作者已移除',
    'collab.removeFailed': '移除失败',
    'collab.deleteModal': '确认删除',
    'collab.deleteWarning': '⚠️ 此操作不可恢复！将删除该 Skill 的所有版本和数据。',
    'collab.deleteLabel': '请输入 Skill ID 确认删除：',
    'collab.deleteConfirmBtn': '确认删除',
    'collab.deleteWrongId': '请输入正确的 Skill ID 确认删除',
    'collab.deleteSuccess': 'Skill 已删除',
    'collab.deleteFailed': '删除失败',

    // Publish page
    'publish.title': '发布新版本 - Skill Base',
    'publish.breadcrumbCurrent': '发布新版本',
    'publish.heading': '发布新版本',
    'publish.uploadLabel': '上传文件',
    'publish.dropText': '拖拽 Skill 文件夹或 zip 到此处',
    'publish.dropSubtitle': '或点击选择文件夹',
    'publish.dropHint': 'Skill ID、名称、描述均从包内读取（文件夹名 / zip 文件名 + SKILL.md），不可手改',
    'publish.or': '或',
    'publish.selectZip': '选择 zip 文件...',
    'publish.selectedFiles': '已选择文件',
    'publish.clearFiles': '清除',
    'publish.selectSkill': '选择 Skill',
    'publish.createNew': '-- 创建新 Skill --',
    'publish.skillSelectHint': '更新已有 Skill 时请选择与包内 Skill ID 一致的一项；新建则保持「创建新 Skill」',
    'publish.idLabel': 'Skill ID',
    'publish.idPlaceholder': '上传文件夹或 zip 后自动填入',
    'publish.idHint': '由文件夹名或 zip 文件名推导（小写字母、数字、连字符、下划线）',
    'publish.nameLabel': 'Skill 名称',
    'publish.namePlaceholder': '上传后从 SKILL.md 读取',
    'publish.nameHint': '来自 SKILL.md（frontmatter 或首行标题）',
    'publish.descLabel': '描述',
    'publish.descPlaceholder': '上传后从 SKILL.md 读取',
    'publish.charCount': '字',
    'publish.descHint': ' / 500 字（与包内一致，截断至 500 字）',
    'publish.changelogLabel': '更新说明',
    'publish.changelogPlaceholder': '描述本次更新的内容...\n\n例如：\n- 新增 xxx 功能\n- 修复 xxx 问题',
    'publish.cancelBtn': '取消',
    'publish.submitBtn': '发布新版本',
    'publish.uploading': '正在上传...',
    'publish.successTitle': '发布成功！',
    'publish.viewDetail': '查看详情',
    'publish.publishAnother': '继续发布',
    'publish.filesCount': ' 个文件',
    'publish.totalSize': '总大小: ',

    // Settings page
    'settings.title': '账户设置 - Skill Base',
    'settings.heading': '账户设置',
    'settings.subtitle': '管理您的个人信息和凭证',
    'settings.basicInfo': '基本信息',
    'settings.usernameLabel': '用户名',
    'settings.usernameHint': '至少 1 个字符，最多 50 个字符',
    'settings.nameLabel': '姓名',
    'settings.namePlaceholder': '请输入您的姓名',
    'settings.nameHint': '可选，用于显示在技能作者信息中',
    'settings.saveBtn': '保存修改',
    'settings.saving': '保存中...',
    'settings.cliSection': 'CLI 访问凭证',
    'settings.cliDesc': '在本地终端使用 <code>skb</code> 命令行工具时，需要获取验证码进行登录。',
    'settings.cliLink': '获取 CLI 验证码',
    'settings.passwordSection': '修改密码',
    'settings.oldPassword': '当前密码',
    'settings.newPassword': '新密码',
    'settings.newPasswordHint': '至少 6 个字符',
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

    // Diff page
    'diff.title': '版本对比 - Skill Base',
    'diff.breadcrumbCurrent': '版本对比',
    'diff.versionA': '版本 A (旧):',
    'diff.versionB': '版本 B (新):',
    'diff.selectVersion': '选择版本...',
    'diff.recalculate': '重新计算',
    'diff.file': '文件:',
    'diff.allFiles': '全部文件',
    'diff.sideBySide': '左右对比',
    'diff.unified': '统一视图',
    'diff.changedFiles': '变更文件列表',
    'diff.back': '返回详情页',
    'diff.missingId': '缺少 Skill ID 参数',
    'diff.loadInfoFailed': '加载 Skill 信息失败',
    'diff.selectBoth': '请选择两个版本进行对比',
    'diff.loadVersionsFailed': '加载版本列表失败',
    'diff.computing': '正在计算差异...',
    'diff.computeFailed': '计算差异失败',
    'diff.empty': '选择两个版本后点击"重新计算"查看差异',
    'diff.linesAdded': '行',
    'diff.linesRemoved': '行',
    'diff.filesChanged': ' 个文件变更',
    'diff.added': '新增',
    'diff.deleted': '删除',
    'diff.modified': '修改',
    'diff.binaryDiff': '二进制文件，无法显示差异',
    'diff.pageTitle': '版本对比 - ',

    // File page
    'file.title': '文件预览 - Skill Base',
    'file.breadcrumbFile': '文件',
    'file.currentVersion': '当前版本:',
    'file.fileDir': '文件目录',
    'file.selectFile': '选择文件以预览',
    'file.clickFile': '点击左侧文件查看内容',
    'file.download': '下载当前版本',
    'file.selectOtherVersion': '选择其他版本...',
    'file.compare': '对比版本',
    'file.back': '返回详情页',
    'file.missingId': '缺少 Skill ID 参数',
    'file.loadFailed': '加载失败',
    'file.binaryFile': '二进制文件，无法预览',
    'file.binaryHint': '请下载 zip 包后在本地查看',
    'file.largeFile': '文件较大，仅显示前 100KB',
    'file.noFile': '无法读取文件',

    // CLI Code page
    'cliCode.title': 'CLI 验证码 - Skill Base',
    'cliCode.heading': 'CLI 验证码',
    'cliCode.subtitle': '在命令行工具中输入此验证码完成登录',
    'cliCode.generating': '正在生成验证码...',
    'cliCode.expires': ' 后过期',
    'cliCode.expired': '已过期',
    'cliCode.copyBtn': '复制验证码',
    'cliCode.copied': '已复制',
    'cliCode.regenerate': '重新生成',
    'cliCode.hintTitle': '使用方法：',
    'cliCode.hintText': '在终端运行 <code>skb login</code>，然后输入上方验证码即可完成 CLI 登录。',
    'cliCode.fromCli': '请登录成功后，在下方输入验证码',
    'cliCode.generateFailed': '生成验证码失败',
    'cliCode.genFailed': '生成失败',
    'cliCode.noCopy': '没有可复制的验证码',
    'cliCode.copiedToast': '验证码已复制到剪贴板',
    'cliCode.pressCopy': '请按 Ctrl+C 复制验证码',
    'cliCode.newGenerated': '新验证码已生成',

    // Admin - User Management
    'admin.title': '用户管理 - Skill Base',
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
    'admin.prevPage': '上一页',
    'admin.nextPage': '下一页',
    'admin.noUsers': '暂无用户',
    'admin.loadFailed': '加载失败，请刷新重试',
    'admin.roleAdmin': '管理员',
    'admin.roleDeveloper': '开发者',
    'admin.statusActive': '✅ 启用',
    'admin.statusDisabled': '⛔ 禁用',
    'admin.editBtn': '编辑',
    'admin.addModal': '添加用户',
    'admin.addUsernameLabel': '用户名',
    'admin.addUsernamePlaceholder': '请输入用户名',
    'admin.addPasswordLabel': '初始密码',
    'admin.addPasswordPlaceholder': '请输入初始密码',
    'admin.addRoleLabel': '角色',
    'admin.roleDeveloperLabel': '开发者',
    'admin.roleAdminLabel': '管理员',
    'admin.editModal': '编辑用户',
    'admin.editUsernameLabel': '用户名',
    'admin.editNameLabel': '姓名',
    'admin.editNamePlaceholder': '请输入姓名',
    'admin.editRoleLabel': '角色',
    'admin.editStatusLabel': '状态',
    'admin.resetPasswordSection': '重置用户密码',
    'admin.resetPasswordBtn': '重置密码',
    'admin.resetModal': '重置密码',
    'admin.resetDesc': '// 为用户重置密码: ',
    'admin.resetPasswordLabel': '新密码',
    'admin.resetPasswordPlaceholder': '请输入新密码',
    'admin.generatePassword': '生成随机密码',
    'admin.toggleVisibility': '切换可见性',
    'admin.adding': '添加中...',
    'admin.addSuccess': '用户添加成功',
    'admin.addFailed': '添加用户失败',
    'admin.getUserFailed': '获取用户信息失败',
    'admin.saving': '保存中...',
    'admin.saveSuccess': '用户信息已更新',
    'admin.saveFailed': '更新用户失败',
    'admin.resetting': '重置中...',
    'admin.resetSuccess': '密码重置成功',
    'admin.resetFailed': '重置密码失败',
    'admin.enterUsername': '请输入用户名',
    'admin.enterPassword': '请输入初始密码',
    'admin.enterNewPassword': '请输入新密码',
    'admin.loadUsersFailed': '加载用户列表失败',
  };

  const en = {
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

    // Skill detail page
    'skill.title': 'Skill Detail - Skill Base',
    'skill.breadcrumbHome': 'Home',
    'skill.loading': 'Loading...',
    'skill.fileDir': 'Files',
    'skill.selectFile': 'Select a file to preview',
    'skill.clickFile': 'Click a file on the left to preview',
    'skill.htmlPreview': 'HTML Preview',
    'skill.mdSource': 'Markdown Source',
    'skill.team': 'Team',
    'skill.addCollaborator': '+ Add Collaborator',
    'skill.deleteSkill': 'Delete Skill',
    'skill.versionHistory': 'Version History',
    'skill.noVersions': 'No version history',
    'skill.owner': 'Owner: ',
    'skill.createdAt': 'Created: ',
    'skill.uploadedBy': 'Uploaded by: ',
    'skill.noChangelog': 'No changelog',
    'skill.selectVersion': 'Select version...',
    'skill.latestTag': '(latest)',
    'skill.download': 'Download',
    'skill.compare': 'Compare',
    'skill.selectVersionFirst': 'Please select a version first',
    'skill.fileNotFound': 'File not found',
    'skill.binaryFile': 'Binary file, cannot preview',
    'skill.binaryHint': 'Download the zip package to view locally',
    'skill.previewFailed': 'Preview failed: ',
    'skill.loadFailed': 'Failed to load Skill details',
    'skill.missingId': 'Missing Skill ID parameter',
    'skill.loadVersionsFailed': 'Failed to load version list',
    'skill.zipFailed': 'Failed to download zip',
    'skill.versionFailed': 'Failed to load version: ',
    'skill.infoLoading': 'Skill info is loading',
    'skill.needTwoVersions': 'At least 2 versions are needed to compare',
    'skill.loadInfoFailed': 'Failed to load Skill info',

    // Collaborators
    'collab.modal': 'Add Collaborator',
    'collab.usernameLabel': 'Username',
    'collab.usernamePlaceholder': 'Enter username',
    'collab.owner': 'Owner',
    'collab.collaborator': 'Collaborator',
    'collab.disabled': ' (disabled)',
    'collab.noUsers': 'No users found',
    'collab.enterUsername': 'Please enter a username',
    'collab.addSuccess': 'Collaborator added',
    'collab.addFailed': 'Failed to add',
    'collab.removeConfirm': 'Are you sure you want to remove this collaborator?',
    'collab.removeSuccess': 'Collaborator removed',
    'collab.removeFailed': 'Failed to remove',
    'collab.deleteModal': 'Confirm Delete',
    'collab.deleteWarning': '⚠️ This action cannot be undone! All versions and data of this Skill will be deleted.',
    'collab.deleteLabel': 'Enter Skill ID to confirm deletion:',
    'collab.deleteConfirmBtn': 'Confirm Delete',
    'collab.deleteWrongId': 'Please enter the correct Skill ID to confirm deletion',
    'collab.deleteSuccess': 'Skill deleted',
    'collab.deleteFailed': 'Failed to delete',

    // Publish page
    'publish.title': 'Publish New Version - Skill Base',
    'publish.breadcrumbCurrent': 'Publish New Version',
    'publish.heading': 'Publish New Version',
    'publish.uploadLabel': 'Upload Files',
    'publish.dropText': 'Drop Skill folder or zip here',
    'publish.dropSubtitle': 'or click to select folder',
    'publish.dropHint': 'Skill ID, name and description are read from the package (folder/zip name + SKILL.md) and cannot be edited manually',
    'publish.or': 'or',
    'publish.selectZip': 'Select zip file...',
    'publish.selectedFiles': 'Selected files',
    'publish.clearFiles': 'Clear',
    'publish.selectSkill': 'Select Skill',
    'publish.createNew': '-- Create New Skill --',
    'publish.skillSelectHint': 'Select a Skill with matching ID when updating; keep "Create New Skill" for new ones',
    'publish.idLabel': 'Skill ID',
    'publish.idPlaceholder': 'Auto-filled after upload',
    'publish.idHint': 'Derived from folder or zip filename (lowercase letters, numbers, hyphens, underscores)',
    'publish.nameLabel': 'Skill Name',
    'publish.namePlaceholder': 'Read from SKILL.md after upload',
    'publish.nameHint': 'From SKILL.md (frontmatter or first heading)',
    'publish.descLabel': 'Description',
    'publish.descPlaceholder': 'Read from SKILL.md after upload',
    'publish.charCount': 'chars',
    'publish.descHint': ' / 500 chars (truncated to match package)',
    'publish.changelogLabel': 'Changelog',
    'publish.changelogPlaceholder': 'Describe the changes in this release...\n\ne.g.:\n- Added xxx feature\n- Fixed xxx issue',
    'publish.cancelBtn': 'Cancel',
    'publish.submitBtn': 'Publish New Version',
    'publish.uploading': 'Uploading...',
    'publish.successTitle': 'Published successfully!',
    'publish.viewDetail': 'View Details',
    'publish.publishAnother': 'Publish Another',
    'publish.filesCount': ' files',
    'publish.totalSize': 'Total size: ',

    // Settings page
    'settings.title': 'Account Settings - Skill Base',
    'settings.heading': 'Account Settings',
    'settings.subtitle': 'Manage your personal information and credentials',
    'settings.basicInfo': 'Basic Information',
    'settings.usernameLabel': 'Username',
    'settings.usernameHint': '1-50 characters',
    'settings.nameLabel': 'Name',
    'settings.namePlaceholder': 'Enter your name',
    'settings.nameHint': 'Optional, shown as skill author info',
    'settings.saveBtn': 'Save Changes',
    'settings.saving': 'Saving...',
    'settings.cliSection': 'CLI Access Credentials',
    'settings.cliDesc': 'To use the <code>skb</code> CLI tool locally, get a verification code to sign in.',
    'settings.cliLink': 'Get CLI Verification Code',
    'settings.passwordSection': 'Change Password',
    'settings.oldPassword': 'Current Password',
    'settings.newPassword': 'New Password',
    'settings.newPasswordHint': 'At least 6 characters',
    'settings.confirmPassword': 'Confirm New Password',
    'settings.changePasswordBtn': 'Change Password',
    'settings.changing': 'Changing...',
    'settings.loadFailed': 'Failed to load user info',
    'settings.usernameLenError': 'Username must be 1-50 characters',
    'settings.updateSuccess': 'Profile updated',
    'settings.updateFailed': 'Update failed',
    'settings.noOldPassword': 'Please enter your current password',
    'settings.newPassTooShort': 'New password must be at least 6 characters',
    'settings.passMismatch': 'Passwords do not match',
    'settings.changeSuccess': 'Password changed successfully',
    'settings.changeFailed': 'Failed to change password',

    // Diff page
    'diff.title': 'Version Diff - Skill Base',
    'diff.breadcrumbCurrent': 'Version Diff',
    'diff.versionA': 'Version A (old):',
    'diff.versionB': 'Version B (new):',
    'diff.selectVersion': 'Select version...',
    'diff.recalculate': 'Recalculate',
    'diff.file': 'File:',
    'diff.allFiles': 'All files',
    'diff.sideBySide': 'Side by Side',
    'diff.unified': 'Unified',
    'diff.changedFiles': 'Changed Files',
    'diff.back': 'Back to Detail',
    'diff.missingId': 'Missing Skill ID parameter',
    'diff.loadInfoFailed': 'Failed to load Skill info',
    'diff.selectBoth': 'Please select two versions to compare',
    'diff.loadVersionsFailed': 'Failed to load version list',
    'diff.computing': 'Computing diff...',
    'diff.computeFailed': 'Failed to compute diff',
    'diff.empty': 'Select two versions and click "Recalculate" to view differences',
    'diff.linesAdded': ' lines',
    'diff.linesRemoved': ' lines',
    'diff.filesChanged': ' files changed',
    'diff.added': 'added',
    'diff.deleted': 'deleted',
    'diff.modified': 'modified',
    'diff.binaryDiff': 'Binary file, cannot show diff',
    'diff.pageTitle': 'Version Diff - ',

    // File page
    'file.title': 'File Preview - Skill Base',
    'file.breadcrumbFile': 'File',
    'file.currentVersion': 'Current Version:',
    'file.fileDir': 'Files',
    'file.selectFile': 'Select a file to preview',
    'file.clickFile': 'Click a file on the left to preview',
    'file.download': 'Download Current Version',
    'file.selectOtherVersion': 'Select another version...',
    'file.compare': 'Compare Versions',
    'file.back': 'Back to Detail',
    'file.missingId': 'Missing Skill ID parameter',
    'file.loadFailed': 'Load failed',
    'file.binaryFile': 'Binary file, cannot preview',
    'file.binaryHint': 'Download the zip package to view locally',
    'file.largeFile': 'Large file, showing first 100KB only',
    'file.noFile': 'Cannot read file',

    // CLI Code page
    'cliCode.title': 'CLI Verification Code - Skill Base',
    'cliCode.heading': 'CLI Verification Code',
    'cliCode.subtitle': 'Enter this code in the CLI to complete sign in',
    'cliCode.generating': 'Generating code...',
    'cliCode.expires': ' remaining',
    'cliCode.expired': 'Expired',
    'cliCode.copyBtn': 'Copy Code',
    'cliCode.copied': 'Copied',
    'cliCode.regenerate': 'Regenerate',
    'cliCode.hintTitle': 'How to use:',
    'cliCode.hintText': 'Run <code>skb login</code> in your terminal, then enter the code above to complete CLI sign in.',
    'cliCode.fromCli': 'After signing in, enter the verification code below',
    'cliCode.generateFailed': 'Failed to generate code',
    'cliCode.genFailed': 'Generation failed',
    'cliCode.noCopy': 'No verification code to copy',
    'cliCode.copiedToast': 'Code copied to clipboard',
    'cliCode.pressCopy': 'Press Ctrl+C to copy the code',
    'cliCode.newGenerated': 'New code generated',

    // Admin - User Management
    'admin.title': 'User Management - Skill Base',
    'admin.heading': 'User Management',
    'admin.subtitle': '// Manage platform users and access control',
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
    'admin.prevPage': 'Previous',
    'admin.nextPage': 'Next',
    'admin.noUsers': 'No users found',
    'admin.loadFailed': 'Failed to load, please refresh',
    'admin.roleAdmin': 'Admin',
    'admin.roleDeveloper': 'Developer',
    'admin.statusActive': '✅ Active',
    'admin.statusDisabled': '⛔ Disabled',
    'admin.editBtn': 'Edit',
    'admin.addModal': 'Add User',
    'admin.addUsernameLabel': 'Username',
    'admin.addUsernamePlaceholder': 'Enter username',
    'admin.addPasswordLabel': 'Initial Password',
    'admin.addPasswordPlaceholder': 'Enter initial password',
    'admin.addRoleLabel': 'Role',
    'admin.roleDeveloperLabel': 'Developer',
    'admin.roleAdminLabel': 'Admin',
    'admin.editModal': 'Edit User',
    'admin.editUsernameLabel': 'Username',
    'admin.editNameLabel': 'Name',
    'admin.editNamePlaceholder': 'Enter name',
    'admin.editRoleLabel': 'Role',
    'admin.editStatusLabel': 'Status',
    'admin.resetPasswordSection': 'Reset User Password',
    'admin.resetPasswordBtn': 'Reset Password',
    'admin.resetModal': 'Reset Password',
    'admin.resetDesc': '// Resetting password for: ',
    'admin.resetPasswordLabel': 'New Password',
    'admin.resetPasswordPlaceholder': 'Enter new password',
    'admin.generatePassword': 'Generate random password',
    'admin.toggleVisibility': 'Toggle visibility',
    'admin.adding': 'Adding...',
    'admin.addSuccess': 'User added successfully',
    'admin.addFailed': 'Failed to add user',
    'admin.getUserFailed': 'Failed to get user info',
    'admin.saving': 'Saving...',
    'admin.saveSuccess': 'User info updated',
    'admin.saveFailed': 'Failed to update user',
    'admin.resetting': 'Resetting...',
    'admin.resetSuccess': 'Password reset successfully',
    'admin.resetFailed': 'Failed to reset password',
    'admin.enterUsername': 'Please enter a username',
    'admin.enterPassword': 'Please enter an initial password',
    'admin.enterNewPassword': 'Please enter a new password',
    'admin.loadUsersFailed': 'Failed to load user list',
  };

  const translations = isChinese ? zh : en;

  /**
   * Get translated string by key.
   * @param {string} key
   * @param {object} [params] - optional interpolation params, e.g. {q: 'foo'}
   * @returns {string}
   */
  function t(key, params) {
    let str = translations[key] ?? key;
    if (params) {
      Object.keys(params).forEach(k => {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
      });
    }
    return str;
  }

  /**
   * Apply data-i18n attribute translations to all matching DOM elements.
   * Elements with data-i18n will have their textContent replaced.
   * Elements with data-i18n-html will have their innerHTML replaced.
   * Elements with data-i18n-placeholder will have their placeholder replaced.
   * Elements with data-i18n-title will have their title replaced.
   */
  function applyI18n() {
    // textContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    // innerHTML (for content with HTML tags)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      el.innerHTML = t(key);
    });
    // placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
    // title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = t(key);
    });
    // Set html lang attribute
    document.documentElement.lang = isChinese ? 'zh-CN' : 'en';
  }

  /**
   * Switch the UI language and persist the choice to localStorage.
   * Reloads the page so all JS-rendered content is re-translated.
   * @param {'zh'|'en'} newLang
   */
  function setLang(newLang) {
    localStorage.setItem('skb-lang', newLang);
    window.location.reload();
  }

  // Expose globals
  window.t = t;
  window.applyI18n = applyI18n;
  window.setLang = setLang;
  window.I18N_LANG = isChinese ? 'zh' : 'en';

  // Auto-apply on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyI18n);
  } else {
    applyI18n();
  }
})();
