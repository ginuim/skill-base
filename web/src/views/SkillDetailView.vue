<template>
  <div class="skill-detail-page min-h-screen pt-8 pb-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Loading State -->
      <div v-if="isInitializing || skillsStore.isLoadingDetail" class="flex items-center justify-center min-h-[70vh]">
        <div class="cube-loader">
          <div class="cube cube-1"></div>
          <div class="cube cube-2"></div>
          <div class="cube cube-3"></div>
          <div class="cube cube-4"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="!skill" class="text-center py-20">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-base-800 flex items-center justify-center">
          <Frown class="w-10 h-10 text-base-600" :stroke-width="2" aria-hidden="true" />
        </div>
        <template v-if="showSessionExpired">
          <h3 class="text-xl font-semibold text-fg-strong mb-2">{{ t('skill.sessionExpired') }}</h3>
          <p class="text-base-400 mb-6">{{ t('skill.sessionExpiredDesc') }}</p>
          <router-link :to="loginRedirect" class="btn-primary px-6 py-3 rounded-lg">
            {{ t('nav.login') }}
          </router-link>
        </template>
        <template v-else-if="showAuthHint">
          <h3 class="text-xl font-semibold text-fg-strong mb-2">{{ t('skill.authRequired') }}</h3>
          <p class="text-base-400 mb-6">{{ t('skill.authRequiredDesc') }}</p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <router-link :to="loginRedirect" class="btn-primary px-6 py-3 rounded-lg">
              {{ t('nav.login') }}
            </router-link>
            <router-link to="/" class="btn-secondary px-6 py-3 rounded-lg">
              {{ t('skill.backToHome') }}
            </router-link>
          </div>
        </template>
        <template v-else>
          <h3 class="text-xl font-semibold text-fg-strong mb-2">{{ t('skill.notFound') }}</h3>
          <p class="text-base-400 mb-6">{{ t('skill.notFoundDesc') }}</p>
          <router-link to="/" class="btn-primary px-6 py-3 rounded-lg">
            {{ t('skill.backToHome') }}
          </router-link>
        </template>
      </div>

      <!-- Skill Detail -->
      <template v-else>
        <nav class="skill-breadcrumb" :aria-label="t('skill.breadcrumbHome')">
          <router-link to="/">{{ t('skill.breadcrumbHome') }}</router-link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{{ skill.name }}</span>
        </nav>

        <div class="skill-detail-layout">
        <!-- Skill Header (open, page-like layout) -->
        <header id="skill-info" class="skill-hero">
          <div class="skill-summary">
            <div class="skill-heading">
              <h1 class="skill-title text-fg-strong">
                <span>{{ skill.name }}</span>
              </h1>
            </div>

            <!-- Description -->
            <div class="skill-desc-wrap group">
              <p class="skill-desc whitespace-pre-wrap" :class="{ 'skill-desc--collapsed': !descriptionExpanded && (skill.description || '').length > 180 }">
                {{ skill.description || t('state.noDesc') }}
              </p>
              <button
                v-if="canManageCollaborators"
                @click="openEditSkillDescription"
                class="skill-desc-edit p-1.5 text-base-400 hover:text-neon-400 transition-all flex-shrink-0 bg-base-950 border border-base-800 rounded"
                :title="t('skill.editSkillDescriptionBtn')"
              >
                <Pencil class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
              </button>
            </div>

            <button v-if="(skill.description || '').length > 180" class="description-toggle" :aria-expanded="descriptionExpanded" @click="descriptionExpanded = !descriptionExpanded">{{ t(descriptionExpanded ? 'skill.lessDescription' : 'skill.moreDescription') }}</button>
            <div class="skill-metadata flex flex-wrap items-center gap-2">
              <span v-if="skill.visibility === 'private'" class="skill-meta-chip skill-meta-chip-private">PRIVATE</span>
              <button
                v-if="authStore.isLoggedIn"
                type="button"
                class="skill-meta-chip skill-meta-chip-action skill-meta-chip-favorite"
                :class="{ 'skill-meta-chip--favorited': skill.is_favorited }"
                :aria-label="skill.is_favorited ? t('skill.unfavorite') : t('skill.favorite')"
                :title="skill.is_favorited ? t('skill.unfavorite') : t('skill.favorite')"
                @click="toggleFavorite"
              >
                <Heart
                  class="skill-favorite-icon"
                  :size="18"
                  :stroke-width="2"
                  :fill="skill.is_favorited ? 'currentColor' : 'none'"
                  :stroke="skill.is_favorited ? 'transparent' : 'currentColor'"
                  aria-hidden="true"
                />
              </button>
              <span class="skill-meta-chip">{{ skill.favorite_count }} {{ t('skill.favoriteCount') }}</span>
              <span class="skill-meta-chip">{{ skill.download_count }} {{ t('skill.downloadCount') }}</span>
              <span v-for="tag in skill.tags" :key="tag.id" class="skill-tag-chip">{{ tag.name }}</span>
              <span v-for="collection in skill.collections || []" :key="collection.id" class="skill-collection-chip">
                {{ collection.name }}
              </span>
              <button
                v-if="canEditTags && showTagEditButton"
                type="button"
                class="skill-meta-chip skill-meta-chip-action"
                @click="showEditTagsModal = true"
              >
                {{ t('skill.editTags') }}
              </button>
            </div>
            <div v-if="skill.contributors?.length" class="skill-contributors">
              <span class="skill-contributors-label">{{ t('skill.contributors') }}</span>
              <ContributorAvatars :people="skill.contributors" :max="8" />
            </div>
          </div>

        </header>
          <!-- Installation and version actions -->
          <div class="skill-install-panel">
            <h2 class="skill-panel-title">{{ t('skill.installTitle') }}</h2>
            <label for="skill-version" class="skill-field-label">{{ t('skill.currentVersion') }}</label>
            <div class="relative w-full">
              <select
                id="skill-version"
                v-model="currentVersion"
                @change="onVersionChange"
                class="w-full appearance-none bg-base-950 border border-base-800 text-fg-strong font-mono text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500 transition-colors cursor-pointer"
              >
                <option v-for="(v, index) in versions" :key="v.id" :value="v.version">
                  {{ v.version }} {{ index === 0 ? t('skill.latestTag') : '' }}
                </option>
              </select>
              <ChevronDown class="w-4 h-4 absolute right-4 top-3 pointer-events-none text-base-400" :stroke-width="2" aria-hidden="true" />
            </div>
            <div class="skill-install-actions">
              <div class="install-methods" role="group" :aria-label="t('skill.installTitle')">
                <button v-for="method in (['agent', 'cli'] as const)" :key="method" type="button" :aria-pressed="installMethod === method" :class="{ 'is-selected': installMethod === method }" @click="installMethod = method">{{ t(method === 'agent' ? 'skill.agentMethod' : 'skill.cliMethod') }}</button>
              </div>
              <p class="install-hint">{{ t(installMethod === 'agent' ? 'skill.agentHint' : 'skill.cliHint') }}</p>
              <div class="install-content">
                <pre>{{ installContent }}</pre>
                <button type="button" class="install-copy" @click="copyTextToClipboard(installContent)">
                  <Copy class="w-3.5 h-3.5" aria-hidden="true" />{{ t(installMethod === 'agent' ? 'skill.copyPrompt' : 'skill.copyCommands') }}
                </button>
              </div>
              <div class="install-secondary-actions">
              <button
                @click="downloadCurrentVersion"
                class="skill-download-button"
              >
                <Download class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
                {{ t('skill.download') }}
              </button>
              <button
                @click="goToDiff"
                class="skill-compare-button"
              >
                <GitCompareArrows class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
                {{ t('skill.compare') }}
              </button>
              </div>
            </div>
          </div>

        <div class="skill-detail-content">
        <!-- Files / Preview / Versions / Team -->
        <div class="detail-tabs mb-6" aria-label="Skill">
          <button
            v-for="tab in detailTabs"
            :key="tab.key"
            type="button"
            class="detail-tab-btn"
            :class="{ 'detail-tab-btn--active': activeTab === tab.key }"
            :aria-pressed="activeTab === tab.key"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Files tab: file navigation and reading pane -->
        <section v-show="activeTab === 'files'" class="skill-file-workspace">
          <!-- Left: File Tree -->
          <div class="skill-file-tree">
            <div class="skill-file-toolbar">{{ t('skill.tabFiles') }}</div>
            <div id="file-tree" class="p-3 flex-1 overflow-y-auto no-scrollbar font-mono text-sm">
              <div v-if="isLoadingZip" class="flex justify-center py-8">
                <div class="spinner spinner-sm"></div>
              </div>
              <div v-else-if="fileTree.length === 0" class="flex flex-col items-center justify-center py-10">
                <p class="text-base-400 font-mono">{{ t('skill.noFile') }}</p>
              </div>
              <template v-else>
                <FileTreeNode
                  v-for="node in fileTree"
                  :key="node.path"
                  :node="node"
                  :selected-path="selectedFilePath"
                  @select="onFileSelect"
                  @toggle="onFolderToggle"
                />
              </template>
            </div>
          </div>

          <!-- Right: File Preview -->
          <div id="file-preview-panel" :class="['skill-file-preview', { 'fullscreen': isFullscreen }]">
            <div class="skill-file-toolbar skill-preview-toolbar">
              <div>
                <span class="skill-file-path">{{ selectedFilePath || t('skill.selectFile') }}</span>
              </div>
              <div class="flex items-center gap-3">
                <div v-if="isMarkdownFile" class="flex gap-2">
                  <button
                    @click="setMarkdownMode('render')"
                    :class="['md-view-btn', markdownMode === 'render' ? 'is-active' : '']"
                  >
                    {{ t('skill.htmlPreview') }}
                  </button>
                  <button
                    @click="setMarkdownMode('source')"
                    :class="['md-view-btn', markdownMode === 'source' ? 'is-active' : '']"
                  >
                    {{ t('skill.mdSource') }}
                  </button>
                </div>
                <button
                  @click="toggleFullscreen"
                  class="md-view-btn"
                  :title="isFullscreen ? t('skill.exitFullscreen') : t('skill.fullscreen')"
                >
                  <Maximize2 v-if="!isFullscreen" class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
                  <Minimize2 v-else class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div id="file-content" class="flex-1 overflow-y-auto overflow-x-auto text-base-400 p-0">
              <div v-if="!selectedFileContent" class="flex flex-col items-center justify-center h-full">
                <div class="flex items-center gap-3 opacity-30 font-mono mb-4">
                  <span class="text-neon-400 animate-pulse">_</span>
                  <span>EOF</span>
                </div>
                <p class="text-sm font-mono">{{ t('skill.selectFile') }}</p>
              </div>
              <div v-else-if="isMarkdownFile && markdownMode === 'render'" class="markdown-body p-6" v-html="renderedMarkdown"></div>
              <div v-else-if="isMarkdownFile && markdownMode === 'source'" class="code-line-grid">
                <div v-for="(line, i) in selectedFileLines" :key="i" class="code-line-row">
                  <span class="line-gutter" aria-hidden="true">{{ i + 1 }}</span>
                  <code class="line-code">{{ line }}</code>
                </div>
              </div>
              <div v-else-if="isTextFile" class="code-line-grid">
                <div v-for="(lineHtml, i) in highlightedCodeLines" :key="i" class="code-line-row">
                  <span class="line-gutter" aria-hidden="true">{{ i + 1 }}</span>
                  <code class="line-code line-code-hl" v-html="lineHtml"></code>
                </div>
              </div>
              <div v-else class="flex flex-col items-center justify-center h-full">
                <p class="text-base-400 font-mono">{{ t('skill.binaryFile') }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Effect previews have a discoverable tab without dominating the overview. -->
        <section v-if="(skill.screenshots || []).length > 0 || canManageCollaborators" v-show="activeTab === 'preview'" class="screenshot-showcase">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm text-base-400 flex items-center gap-2">
              {{ t('skill.tabPreview') }}
            </div>
            <button
              v-if="canManageCollaborators"
              type="button"
              class="skill-meta-chip skill-meta-chip-action disabled:opacity-50"
              :disabled="isUploadingScreenshot"
              @click="screenshotInputRef?.click()"
            >
              <span v-if="isUploadingScreenshot" class="spinner spinner-sm inline-block mr-1 align-middle"></span>
              {{ isUploadingScreenshot ? t('skill.screenshotUploading') : '+ ' + t('skill.screenshotUpload') }}
            </button>
          </div>
          <p class="preview-description">{{ t('skill.previewHint') }}</p>
          <div v-if="!(skill.screenshots || []).length" class="preview-empty">{{ t('skill.previewEmpty') }}</div>
          <div v-if="(skill.screenshots || []).length > 0" class="screenshot-strip">
            <figure
              v-for="shot in skill.screenshots"
              :key="shot.id"
              class="screenshot-thumb group"
            >
              <button type="button" class="screenshot-open" :aria-label="t('skill.screenshotPreview')" @click="openLightbox(shot.id)">
              <img
                :src="screenshotSrc(shot)"
                :alt="t('skill.screenshotPreview')"
                loading="lazy"
                class="screenshot-img"
              />
              </button>
              <button
                v-if="canManageCollaborators"
                type="button"
                class="screenshot-delete-btn"
                :title="t('btn.remove')"
                @click.stop="deleteScreenshot(shot.id)"
              >
                &times;
              </button>
            </figure>
          </div>
          <input
            ref="screenshotInputRef"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            class="hidden"
            @change="onScreenshotFileChange"
          />
        </section>

        <!-- Team & Access tab: left collaborators, right ACL + Webhook -->
        <div v-if="canManageCollaborators && activeTab === 'team'" class="team-settings">
          <div class="team-settings-grid">
          <div class="bg-base-900 border border-base-800 rounded-xl h-fit">
            <div class="px-5 py-4 border-b border-base-800 font-mono font-semibold text-fg-strong flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                {{ t('skill.collaborators') }}
              </div>
              <button
                v-if="skillsStore.isOwner"
                @click="showAddCollaboratorModal = true"
                class="text-xs text-neon-400 hover:text-fg-strong transition-colors"
              >
                + {{ t('btn.add') }}
              </button>
            </div>
            <div class="p-5 flex flex-col gap-4">
              <!-- Owner -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <UserAvatar
                    :avatar="skill.owner?.avatar"
                    :name="skill.owner?.name"
                    :username="skill.owner?.username"
                    size-class="w-10 h-10 text-sm"
                  />
                  <div>
                    <div class="font-medium text-fg-strong text-sm">{{ skill.owner?.name || skill.owner?.username }}</div>
                    <div class="text-xs text-base-400">{{ skill.owner?.email || '' }}</div>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded text-xs font-mono bg-neon-400/10 text-neon-400 border border-neon-400/20">
                  {{ t('collab.owner') }}
                </span>
              </div>
              <!-- Collaborators -->
              <div
                v-for="collaborator in (skill.collaborators || [])"
                :key="collaborator.id"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-3">
                  <UserAvatar
                    :avatar="collaborator.avatar"
                    :name="collaborator.name"
                    :username="collaborator.username"
                    size-class="w-10 h-10 text-sm"
                  />
                  <div>
                    <div class="font-medium text-fg-strong text-sm">{{ collaborator.name || collaborator.username }}</div>
                    <div class="text-xs text-base-400">{{ collaborator.email || '' }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-xs font-mono bg-blue-400/10 text-blue-400 border border-blue-400/20">
                    {{ t('collab.collaborator') }}
                  </span>
                  <button
                    v-if="skillsStore.isOwner"
                    @click="removeCollaborator(collaborator.id)"
                    class="p-1.5 text-base-400 hover:text-red-400 transition-colors"
                    :title="t('btn.remove')"
                  >
                    <Trash2 class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right column: ACL (visibility) + Webhook (owner only) -->
          <div v-if="skillsStore.isOwner" class="bg-base-900 border border-base-800 rounded-xl h-fit">
            <div class="px-5 py-4 border-b border-base-800 font-mono font-semibold text-fg-strong text-sm">
              {{ t('skill.tabAccess') }}
            </div>
            <div class="px-5 py-4">
              <div class="font-mono text-xs text-fg-strong/90 mb-1 flex items-center gap-2">

                {{ t('skill.visibilityTitle') }}
              </div>
              <p class="text-[11px] text-base-500 mb-2 leading-relaxed">{{ t('skill.visibilityHint') }}</p>
              <select
                id="skill-visibility"
                :aria-label="t('skill.visibilityTitle')"
                v-model="visibilityDraft"
                class="w-full bg-base-950 border border-base-800 text-fg-strong text-xs font-mono rounded px-3 py-2 mb-2 focus:outline-none focus:border-neon-500"
              >
                <option value="public">{{ t('visibility.public') }}</option>
                <option value="private">{{ t('visibility.private') }}</option>
              </select>
              <button
                type="button"
                class="w-full py-2 text-xs font-mono text-neon-400 border border-neon-500/30 rounded bg-neon-400/5 hover:bg-neon-400/10 transition-colors disabled:opacity-50 mb-3"
                :disabled="isSavingVisibility"
                @click="saveVisibility"
              >
                <span v-if="isSavingVisibility" class="spinner spinner-sm inline-block mr-2 align-middle"></span>
                {{ t('skill.visibilitySave') }}
              </button>
              <div class="font-mono text-xs text-fg-strong/90 mb-1 flex items-center gap-2">

                {{ t('skill.webhookTitle') }}
              </div>
              <p class="text-[11px] text-base-500 mb-2 leading-relaxed">{{ t('skill.webhookHint') }}</p>
              <input
                id="skill-webhook"
                :aria-label="t('skill.webhookTitle')"
                v-model="webhookDraft"
                type="url"
                autocomplete="off"
                class="w-full bg-base-950 border border-base-800 text-fg-strong text-xs font-mono rounded px-3 py-2 mb-2 focus:outline-none focus:border-neon-500"
                :placeholder="t('skill.webhookPlaceholder')"
              />
              <button
                type="button"
                class="w-full py-2 text-xs font-mono text-neon-400 border border-neon-500/30 rounded bg-neon-400/5 hover:bg-neon-400/10 transition-colors disabled:opacity-50"
                :disabled="isSavingWebhook"
                @click="saveWebhook"
              >
                <span v-if="isSavingWebhook" class="spinner spinner-sm inline-block mr-2 align-middle"></span>
                {{ t('skill.webhookSave') }}
              </button>
            </div>
          </div>
          </div>

          <!-- Destructive action remains secondary. -->
          <div v-if="skillsStore.isOwner" class="danger-setting"><div><h3>{{ t('skill.deleteSkill') }}</h3><p>{{ t('skill.deleteHint') }}</p></div>
            <button
              @click="showDeleteModal = true"
              class="danger-button"
            >
              {{ t('skill.deleteSkill') }}
            </button>
          </div>
        </div>

        <!-- Versions tab -->
        <div v-show="activeTab === 'versions'">
          <div class="bg-base-900 border border-base-800 rounded-xl">
            <div
              class="px-5 py-4 border-b border-base-800 flex items-center justify-between rounded-t-xl cursor-pointer hover:bg-white/5 transition-colors"
              @click="isVersionHistoryCollapsed = !isVersionHistoryCollapsed"
            >
              <div class="flex items-center gap-2 font-mono font-semibold text-fg-strong text-sm">
                <span class="text-neon-400">git</span> log
              </div>
              <span class="text-base-400 transition-transform inline-flex" :class="isVersionHistoryCollapsed ? '-rotate-90' : ''">
                <ChevronDown :size="20" :stroke-width="2" aria-hidden="true" />
              </span>
            </div>
            <div v-if="!isVersionHistoryCollapsed" class="p-6 overflow-hidden">
              <div id="version-list" class="relative pl-6">
                <div class="absolute left-[8px] top-0 bottom-2 w-px -translate-x-1/2 bg-base-800"></div>

                <div
                  v-for="v in versions"
                  :key="v.id"
                  class="relative mb-8 last:mb-0 group cursor-pointer"
                >
                  <!-- Timeline dot -->
                  <span
                    class="absolute -left-[21px] top-2 w-2.5 h-2.5 rounded-full ring-4 ring-base-900 transition-colors"
                    :class="v.version === skill.latest_version ? 'bg-neon-400 skill-timeline-dot-glow' : 'bg-base-800 group-hover:bg-neon-500'"
                  ></span>

                  <div class="flex items-start justify-between gap-4 p-3 -m-3 rounded-lg transition-all duration-200 group-hover:bg-white/5">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          class="text-xs px-2 py-0.5 rounded font-mono border transition-colors"
                          :class="v.version === skill.latest_version ? 'text-neon-400 border-neon-500/30 bg-neon-400/5' : 'text-base-400 border-base-800 group-hover:text-neon-400 group-hover:border-neon-500/30'"
                        >
                          {{ v.version }}
                        </span>
                        <span v-if="v.version === skill.latest_version" class="bg-base-200 text-base-900 text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide font-mono uppercase">Head</span>
                      </div>
                      <p class="text-sm font-medium mt-2" :class="v.version === skill.latest_version ? 'text-fg-strong' : 'text-base-200'">
                        {{ v.changelog || t('skill.noChangelog') }}
                      </p>
                      <p class="text-xs text-base-400 mt-1 flex items-center gap-1.5 font-mono">
                        by @{{ v.uploader?.name || v.uploader?.username || t('state.unknown') }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <div class="flex flex-col items-end gap-1">
                        <span class="text-xs text-base-400 font-mono whitespace-nowrap text-right" :title="formatDateFull(v.created_at)">{{ formatDate(v.created_at, currentLang) }}</span>
                        <span class="text-[10px] text-base-500 font-mono">{{ v.download_count }} {{ t('skill.downloadCount') }}</span>
                      </div>

                      <button
                        v-if="canManageCollaborators && v.version !== skill.latest_version"
                        title="Set as Head"
                        class="flex items-center justify-center p-2 text-base-400 border border-base-800 rounded bg-base-950 hover:text-neon-400 hover:border-neon-500 hover:bg-neon-400/10 transition-all"
                        @click.stop="setHeadVersion(v.version)"
                      >
                        <ArrowUpToLine class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
                      </button>

                      <button
                        v-if="canManageCollaborators"
                        title="Edit Version"
                        class="flex items-center justify-center p-2 text-base-400 border border-base-800 rounded bg-base-950 hover:text-neon-400 hover:border-neon-500 hover:bg-neon-400/10 transition-all"
                        @click.stop="openEditVersionModal(v, 'changelog')"
                      >
                        <Pencil class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
                      </button>

                      <button
                        :title="t('skill.download')"
                        class="skill-icon-btn-neon-hover flex items-center justify-center p-2 text-base-400 border border-base-800 rounded bg-base-950 hover:text-neon-400 hover:border-neon-500 hover:bg-neon-400/10 transition-all"
                        @click.stop="downloadVersion(v.version)"
                      >
                        <Download class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="versions.length === 0" class="flex flex-col items-center justify-center py-8">
                  <p class="text-base-400 font-mono">{{ t('skill.noVersions') }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
        </div>
      </template>
    </div>

    <!-- Add Collaborator Modal -->
    <div v-if="showAddCollaboratorModal" class="modal" @click.self="showAddCollaboratorModal = false">
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ t('collab.modal') }}</h3>
          <button class="modal-close" @click="showAddCollaboratorModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group relative">
            <label>{{ t('collab.usernameLabel') }}</label>
            <CollaboratorUserPicker
              ref="collaboratorPickerRef"
              v-model="newCollaboratorUsername"
              :exclude-user-ids="collaboratorExcludedIdsList"
              :active="showAddCollaboratorModal"
              :placeholder="t('collab.usernamePlaceholder')"
              @enter="submitAddCollaborator"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddCollaboratorModal = false">{{ t('btn.cancel') }}</button>
          <button class="btn btn-primary" @click="submitAddCollaborator" :disabled="!newCollaboratorUsername || isAddingCollaborator">
            <span v-if="isAddingCollaborator" class="spinner spinner-sm mr-2"></span>
            {{ t('btn.add') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Skill Modal -->
    <div v-if="showDeleteModal" class="modal" @click.self="showDeleteModal = false">
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ t('collab.deleteModal') }}</h3>
          <button class="modal-close" @click="showDeleteModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <p class="warning-text">{{ t('collab.deleteWarning') }}</p>
          <div class="form-group">
            <label>{{ t('collab.deleteLabel') }} {{ skill?.id }}</label>
            <input
              v-model="deleteConfirmInput"
              type="text"
              placeholder=""
              class="form-input"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDeleteModal = false">{{ t('btn.cancel') }}</button>
          <button class="btn btn-danger" @click="submitDeleteSkill" :disabled="deleteConfirmInput !== String(skill?.id)">{{ t('collab.deleteConfirmBtn') }}</button>
        </div>
      </div>
    </div>

    <!-- Edit Version Modal -->
    <div v-if="showEditVersionModal" class="modal" @click.self="showEditVersionModal = false">
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            {{ editVersionMode === 'description'
              ? t('skill.editSkillDescriptionTitle')
              : `${t('skill.editVersionTitleChangelog')} (${editVersionForm.version})` }}
          </h3>
          <button class="modal-close" @click="showEditVersionModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="editVersionMode === 'description'" class="form-group">
            <label>{{ t('skill.editSkillDescriptionLabel') }}</label>
            <textarea
              v-model="editVersionForm.description"
              :placeholder="t('skill.editSkillDescriptionPlaceholder')"
              class="form-input min-h-[100px]"
            ></textarea>
          </div>
          <div v-if="editVersionMode === 'changelog'" class="form-group">
            <label>{{ t('skill.editVersionLabelChangelog') }}</label>
            <textarea
              v-model="editVersionForm.changelog"
              :placeholder="t('skill.editVersionPlaceholderChangelog')"
              class="form-input min-h-[100px]"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showEditVersionModal = false">{{ t('btn.cancel') }}</button>
          <button class="btn btn-primary" @click="submitEditVersion" :disabled="isEditingVersion">
            <span v-if="isEditingVersion" class="spinner spinner-sm mr-2"></span>
            {{ t('btn.save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Tags Modal -->
    <div v-if="showEditTagsModal" class="modal" @click.self="showEditTagsModal = false">
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ t('skill.editTags') }}</h3>
          <button class="modal-close" @click="showEditTagsModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="allTags.length === 0" class="text-sm text-base-400 font-mono">
            {{ t('skill.noTags') }}
          </div>
          <label
            v-for="tag in allTags"
            :key="tag.id"
            class="tag-option-row"
          >
            <input
              v-model="selectedTagIds"
              type="checkbox"
              :value="tag.id"
            />
            <span>{{ tag.name }}</span>
          </label>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showEditTagsModal = false">{{ t('btn.cancel') }}</button>
          <button class="btn btn-primary" @click="saveSkillTags" :disabled="isSavingTags">
            <span v-if="isSavingTags" class="spinner spinner-sm mr-2"></span>
            {{ t('btn.save') }}
          </button>
        </div>
      </div>
    </div>
    <!-- Screenshot Lightbox -->
    <div v-if="lightboxShot" class="screenshot-lightbox" @click.self="closeLightbox">
      <div class="screenshot-lightbox-overlay" @click="closeLightbox"></div>
      <button type="button" class="screenshot-lightbox-close" :title="t('btn.cancel')" @click="closeLightbox">&times;</button>
      <button
        v-if="(skill?.screenshots || []).length > 1"
        type="button"
        class="screenshot-lightbox-nav screenshot-lightbox-prev"
        @click.stop="stepLightbox(-1)"
      >&lsaquo;</button>
      <img :src="screenshotSrc(lightboxShot)" :alt="t('skill.screenshotPreview')" class="screenshot-lightbox-img" />
      <button
        v-if="(skill?.screenshots || []).length > 1"
        type="button"
        class="screenshot-lightbox-nav screenshot-lightbox-next"
        @click.stop="stepLightbox(1)"
      >&rsaquo;</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Frown,
  Heart,
  Pencil,
  ChevronDown,
  Copy,
  GitCompareArrows,
  Download,
  Maximize2,
  Minimize2,
  Trash2,
  ArrowUpToLine,
} from 'lucide-vue-next'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSkillsStore } from '@/stores/skills'
import { useI18n } from '@/composables/useI18n'
import { versionsApi, skillsApi, tagsApi, screenshotsApi, type SkillVersion, type Tag, type SkillScreenshot } from '@/services/api'
import { globalToast } from '@/composables/useToast'
import { marked } from 'marked'
import hljs from 'highlight.js'
import FileTreeNode, { type TreeNode } from '@/components/FileTreeNode.vue'
import CollaboratorUserPicker from '@/components/CollaboratorUserPicker.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import ContributorAvatars from '@/components/ContributorAvatars.vue'
import { formatDate, formatDateFull } from '@/utils/date'
import { appBasePath, withBasePath } from '@/utils/basePath'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const skillsStore = useSkillsStore()
const { t, currentLang } = useI18n()

const skillId = computed(() => route.params.id as string)
const skill = computed(() => skillsStore.currentSkill)

const loginRedirect = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath },
}))

const showSessionExpired = computed(() => {
  if (skill.value || isInitializing.value || skillsStore.isLoadingDetail) return false
  return skillsStore.errorStatus === 401 || skillsStore.errorCode === 'session_expired'
})

const showAuthHint = computed(() => {
  if (skill.value || isInitializing.value || skillsStore.isLoadingDetail) return false
  if (showSessionExpired.value) return false
  return !authStore.isLoggedIn && authStore.hasFetchedUser && skillsStore.errorStatus === 404
})

const descriptionExpanded = ref(false)
const installMethod = ref<'agent' | 'cli'>('agent')
const installSite = window.location.origin + appBasePath.replace(/\/$/, '')
// Single-quoted arguments preserve literal values when pasted into a POSIX shell.
const shellQuote = (value: string) => "'" + value.replace(/'/g, "'\"'\"'") + "'"
const installCliCommand = computed(() => {
  const target = `${skill.value?.id || skillId.value}${currentVersion.value ? '@' + currentVersion.value : ''}`
  return `skb install ${shellQuote(target)}`
})
const installCommands = computed(() => [
  'npm install -g skill-base-cli',
  `skb init --server ${shellQuote(installSite)}`,
  ...(skill.value?.visibility === 'private' ? ['skb login'] : []),
  installCliCommand.value,
].join('\n'))
const installContent = computed(() => installMethod.value === 'cli' ? installCommands.value :
  `${t('skill.agentPrompt')}\n${window.location.origin}${withBasePath('/skills/' + encodeURIComponent(skillId.value))}\n\n${installCommands.value}\n\n${t('skill.agentPromptEnd')}`)

async function copyTextToClipboard(text: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    globalToast.success(t('skill.copyInstallSuccess'))
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    try {
      const ok = document.execCommand('copy')
      if (ok) globalToast.success(t('skill.copyInstallSuccess'))
      else globalToast.error(t('skill.copyInstallFailed'))
    } catch {
      globalToast.error(t('skill.copyInstallFailed'))
    } finally {
      document.body.removeChild(ta)
    }
  }
}

// Version management
const versions = ref<SkillVersion[]>([])
const currentVersion = ref<string>('')
const isLoadingZip = ref(false)
const currentZip = ref<any>(null)

// File tree
const fileTree = ref<any[]>([])
const selectedFilePath = ref('')
const selectedFileContent = ref('')
const expandedFolders = ref<Set<string>>(new Set())

// Markdown preview
const markdownMode = ref<'render' | 'source'>('render')
const isMarkdownFile = computed(() => {
  if (!selectedFilePath.value) return false
  return selectedFilePath.value.toLowerCase().endsWith('.md')
})

// UI state
const isInitializing = ref(true)
const activeTab = ref<'files' | 'preview' | 'versions' | 'team'>('files')
const canManageCollaborators = computed(() => {
  if (!skill.value) return false
  return skill.value.permission === 'owner' || skill.value.permission === 'collaborator'
})
const detailTabs = computed(() => {
  const tabs: Array<{ key: 'files' | 'preview' | 'versions' | 'team'; label: string }> = [
    { key: 'files' as const, label: t('skill.tabFiles') },
    { key: 'versions' as const, label: t('skill.tabVersions') },
  ]
  if ((skill.value?.screenshots || []).length || canManageCollaborators.value) {
    tabs.splice(1, 0, { key: 'preview', label: `${t('skill.tabPreview')}${skill.value?.screenshots?.length ? ' · ' + skill.value.screenshots.length : ''}` })
  }
  if (canManageCollaborators.value) {
    tabs.push({ key: 'team' as const, label: t('skill.tabTeam') })
  }
  return tabs
})

// Screenshots
const screenshotInputRef = ref<HTMLInputElement | null>(null)
const isUploadingScreenshot = ref(false)
const lightboxShotId = ref<string | null>(null)
const lightboxShot = computed<SkillScreenshot | null>(() => {
  const shots = skill.value?.screenshots || []
  return shots.find((s) => s.id === lightboxShotId.value) || null
})

function screenshotSrc(shot: SkillScreenshot) {
  return screenshotsApi.fileUrl(shot)
}

function openLightbox(shotId: string) {
  lightboxShotId.value = shotId
}

function closeLightbox() {
  lightboxShotId.value = null
}

function stepLightbox(step: number) {
  const shots = skill.value?.screenshots || []
  if (shots.length === 0 || !lightboxShotId.value) return
  const idx = shots.findIndex((s) => s.id === lightboxShotId.value)
  const next = (idx + step + shots.length) % shots.length
  lightboxShotId.value = shots[next]!.id
}

async function onScreenshotFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !skill.value) return

  isUploadingScreenshot.value = true
  try {
    const res = await screenshotsApi.upload(skillId.value, file)
    skill.value.screenshots = res.screenshots
    globalToast.success(t('skill.screenshotUploadSuccess'))
  } catch (err: any) {
    globalToast.error(err.message || t('skill.screenshotUploadFailed'))
  } finally {
    isUploadingScreenshot.value = false
  }
}

async function deleteScreenshot(shotId: string) {
  if (!skill.value) return
  if (!confirm(t('skill.screenshotDeleteConfirm'))) return
  try {
    const res = await screenshotsApi.remove(skillId.value, shotId)
    skill.value.screenshots = res.screenshots
    if (lightboxShotId.value === shotId) closeLightbox()
  } catch (err: any) {
    globalToast.error(err.message || t('skill.screenshotDeleteFailed'))
  }
}

const isVersionHistoryCollapsed = ref(false)
const showAddCollaboratorModal = ref(false)
const showDeleteModal = ref(false)
const showEditVersionModal = ref(false)
const showEditTagsModal = ref(false)
const showTagEditButton = true
const editVersionMode = ref<'description' | 'changelog'>('description')
const editVersionForm = ref({ version: '', description: '', changelog: '' })
const isEditingVersion = ref(false)
const isSavingTags = ref(false)
const newCollaboratorUsername = ref('')
const isAddingCollaborator = ref(false)
const collaboratorPickerRef = ref<InstanceType<typeof CollaboratorUserPicker> | null>(null)
const deleteConfirmInput = ref('')
const isFullscreen = ref(false)
const webhookDraft = ref('')
const isSavingWebhook = ref(false)
const visibilityDraft = ref<'public' | 'private'>('public')
const isSavingVisibility = ref(false)
const allTags = ref<Tag[]>([])
const selectedTagIds = ref<number[]>([])

const collaboratorExcludedIdsList = computed(() => {
  const ids: number[] = []
  const s = skill.value
  if (!s) return ids
  if (s.owner?.id != null) ids.push(s.owner.id)
  for (const c of s.collaborators || []) ids.push(c.id)
  if (authStore.user?.id != null) ids.push(authStore.user.id)
  return ids
})

watch(
  () => skill.value?.visibility,
  (visibility) => {
    visibilityDraft.value = visibility === 'private' ? 'private' : 'public'
  },
  { immediate: true }
)

watch(
  () => skill.value?.webhook_url,
  (url) => {
    webhookDraft.value = url ?? ''
  },
  { immediate: true }
)

watch(
  () => skill.value?.tags,
  (tags) => {
    selectedTagIds.value = (tags || []).map((tag) => tag.id)
  },
  { immediate: true }
)

async function saveWebhook() {
  if (!skill.value) return
  isSavingWebhook.value = true
  try {
    const trimmed = webhookDraft.value.trim()
    await skillsStore.updateSkill(skillId.value, { webhook_url: trimmed ? trimmed : null })
    globalToast.success(t('skill.webhookSaved'))
    await skillsStore.fetchSkill(skillId.value)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('skill.webhookSaveFailed')
    globalToast.error(msg)
  } finally {
    isSavingWebhook.value = false
  }
}

async function saveVisibility() {
  if (!skill.value) return
  isSavingVisibility.value = true
  try {
    await skillsStore.updateSkill(skillId.value, { visibility: visibilityDraft.value })
    globalToast.success(t('skill.visibilitySaved'))
    await skillsStore.fetchSkill(skillId.value)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('skill.visibilitySaveFailed')
    globalToast.error(msg)
  } finally {
    isSavingVisibility.value = false
  }
}

function normalizeLineEndings(content: string) {
  return content.replace(/\r\n?/g, '\n')
}

// Text file extensions
const TEXT_EXTS = new Set([
  '.md', '.py', '.sh', '.bash', '.zsh',
  '.js', '.jsx', '.ts', '.tsx', '.vue',
  '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.txt', '.text', '.log', '.csv',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.xml', '.sql', '.go', '.rs', '.java', '.c', '.cpp',
  '.h', '.hpp', '.cs', '.rb', '.php', '.swift', '.kt',
  '.dockerfile', '.gitignore', '.env.example',
])

const TEXT_FILENAMES = new Set([
  'dockerfile', 'makefile', 'rakefile', 'readme', 'license', 'changelog',
  '.gitignore', '.gitattributes', '.editorconfig', '.env', '.env.example',
])

const canEditTags = computed(() => canManageCollaborators.value)

const isTextFile = computed(() => {
  if (!selectedFilePath.value) return false
  const path = selectedFilePath.value.toLowerCase()
  const ext = '.' + path.split('.').pop()
  const name = path.split('/').pop() || ''
  return TEXT_EXTS.has(ext) || TEXT_FILENAMES.has(name) || TEXT_FILENAMES.has(name.replace(/^\./, ''))
})

function getLanguage(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sql': 'sql',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'vue': 'xml',
    'xml': 'xml',
    'md': 'markdown',
    'toml': 'ini',
    'ini': 'ini',
    'cfg': 'ini',
  }
  return langMap[ext] || 'plaintext'
}

const highlightedCodeLines = computed(() => {
  if (!selectedFileContent.value) return []
  const content = normalizeLineEndings(selectedFileContent.value)
  const language = isMarkdownFile.value && markdownMode.value === 'source' ? 'markdown' : getLanguage(selectedFilePath.value)

  let highlighted: string
  try {
    highlighted = hljs.highlight(content, { language }).value
  } catch (err) {
    // Escape HTML for safety if highlight fails
    highlighted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  return highlighted.split('\n')
})

const renderedMarkdown = computed(() => {
  if (!selectedFileContent.value) return ''
  return marked.parse(normalizedSelectedFileContent.value)
})

const normalizedSelectedFileContent = computed(() => {
  if (!selectedFileContent.value) return ''
  return normalizeLineEndings(selectedFileContent.value)
})

/** 按 \\n 拆行；与行号一一对应，每行单独容器内 pre-wrap，避免「整列行号 vs 整块 pre 折行」高度错位 */
const selectedFileLines = computed(() => {
  if (!selectedFileContent.value) return []
  return normalizeLineEndings(selectedFileContent.value).split('\n')
})

onMounted(async () => {
  // Set page title
  document.title = t('skill.title')

  await authStore.fetchUser()
  await skillsStore.fetchSkill(skillId.value)
  if (canEditTags.value) {
    await loadAvailableTags()
  }

  // Load versions
  await loadVersions()

  // Load initial version (deep link: ?version=vYYYYMMDD.HHmmss)
  const queryVersion = typeof route.query.version === 'string' ? route.query.version.trim() : ''
  if (queryVersion && versions.value.some((v) => v.version === queryVersion)) {
    currentVersion.value = queryVersion
    await loadVersionZip(currentVersion.value)
  } else if (versions.value.length > 0) {
    currentVersion.value = versions.value[0]!.version
    await loadVersionZip(currentVersion.value)
  }

  isInitializing.value = false

  // ESC 键退出全屏
  document.addEventListener('keydown', handleEscKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscKey)
})

async function loadVersions() {
  try {
    const response = await versionsApi.list(skillId.value)
    versions.value = response.versions || []
  } catch (err) {
    console.error('Failed to load versions:', err)
  }
}

async function loadAvailableTags() {
  try {
    const response = await tagsApi.list()
    allTags.value = response.tags || []
  } catch (err) {
    globalToast.error(t('skill.tagsLoadFailed'))
  }
}

async function onVersionChange() {
  if (currentVersion.value) {
    await loadVersionZip(currentVersion.value)
  }
}

async function loadVersionZip(version: string) {
  isLoadingZip.value = true
  selectedFilePath.value = ''
  selectedFileContent.value = ''

  try {
    const response = await fetch(versionsApi.viewUrl(skillId.value, version), {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Failed to view version')
    }

    const zipData = await response.arrayBuffer()

    // Dynamic import JSZip
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(zipData)
    currentZip.value = zip

    // Generate file tree
    fileTree.value = generateFileTree(zip)
    await selectDefaultSkillMdIfPresent(zip)
  } catch (err) {
    console.error('Failed to load version zip:', err)
    fileTree.value = []
  } finally {
    isLoadingZip.value = false
  }
}

async function toggleFavorite() {
  if (!skill.value) return

  try {
    await skillsStore.toggleFavorite(skill.value.id, !skill.value.is_favorited)
  } catch (err: any) {
    globalToast.error(err.message || t('skill.favoriteFailed'))
  }
}

async function saveSkillTags() {
  if (!skill.value) return

  isSavingTags.value = true
  try {
    await skillsStore.replaceSkillTags(skill.value.id, selectedTagIds.value)
    globalToast.success(t('skill.tagsSaveSuccess'))
    showEditTagsModal.value = false
  } catch (err: any) {
    globalToast.error(err.message || t('skill.tagsSaveFailed'))
  } finally {
    isSavingTags.value = false
  }
}

function generateFileTree(zip: any): any[] {
  const root: any = { type: 'directory', name: '', children: [], path: '' }

  zip.forEach((relativePath: string, zipEntry: any) => {
    if (!relativePath) return

    const parts = relativePath.split('/').filter(Boolean)
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const isDir = zipEntry.dir || !isLast

      let child = current.children.find((c: any) => c.name === part)
      if (!child) {
        child = {
          type: isDir ? 'directory' : 'file',
          name: part,
          path: relativePath,
          ...(isDir ? { children: [], isOpen: false } : {})
        }
        current.children.push(child)
      }
      if (isDir) current = child
    }
  })

  sortTree(root.children)
  return root.children
}

function sortTree(nodes: any[]) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })

  nodes.forEach((node: any) => {
    if (node.children) {
      sortTree(node.children)
    }
  })
}

/** 选路径最浅的 SKILL.md（不区分大小写），与平台约定一致 */
function findShallowestSkillMdPath(zip: any): string | null {
  let best: string | null = null
  let bestDepth = Infinity
  zip.forEach((relativePath: string, zipEntry: any) => {
    if (!relativePath || zipEntry.dir) return
    const parts = relativePath.split('/').filter(Boolean)
    const leaf = parts[parts.length - 1]
    if (!leaf || leaf.toLowerCase() !== 'skill.md') return
    const depth = parts.length
    if (depth < bestDepth) {
      bestDepth = depth
      best = relativePath
    }
  })
  return best
}

function expandAncestorsForFilePath(nodes: any[], filePath: string) {
  const segments = filePath.split('/').filter(Boolean)
  if (segments.length <= 1) return
  let level: any[] = nodes
  for (let i = 0; i < segments.length - 1; i++) {
    const name = segments[i]!
    const dir = level.find((n: any) => n.type === 'directory' && n.name === name)
    if (!dir) return
    dir.isOpen = true
    level = dir.children || []
  }
}

async function selectFileByPath(path: string) {
  selectedFilePath.value = path
  if (!currentZip.value) return

  const file = currentZip.value.file(path)
  if (!file) return

  try {
    const content = await file.async('string')
    selectedFileContent.value = content
    if (path.toLowerCase().endsWith('.md')) {
      markdownMode.value = 'render'
    }
  } catch {
    selectedFileContent.value = ''
  }
}

async function selectDefaultSkillMdIfPresent(zip: any) {
  const path = findShallowestSkillMdPath(zip)
  if (!path) return
  expandAncestorsForFilePath(fileTree.value, path)
  await selectFileByPath(path)
}

async function onFileSelect(node: TreeNode) {
  await selectFileByPath(node.path)
}

function onFolderToggle(node: TreeNode) {
  node.isOpen = !node.isOpen
}

function setMarkdownMode(mode: 'render' | 'source') {
  markdownMode.value = mode
}

function downloadCurrentVersion() {
  if (!currentVersion.value) return
  downloadVersion(currentVersion.value)
}

function downloadVersion(version: string) {
  window.open(versionsApi.downloadUrl(skillId.value, version), '_blank')
}

function goToDiff() {
  if (!skill.value) {
    globalToast.warning(t('skill.infoLoading'))
    return
  }

  if (versions.value.length < 2) {
    globalToast.warning(t('skill.needTwoVersions'))
    return
  }

  // 默认对比最新两个版本
  const versionA = versions.value[1]?.version || ''
  const versionB = versions.value[0]?.version || ''
  router.push({
    path: '/diff',
    query: {
      id: skillId.value,
      version_a: versionA,
      version_b: versionB
    }
  })
}

async function submitAddCollaborator() {
  const name = newCollaboratorUsername.value.trim()
  if (!name || isAddingCollaborator.value) return
  isAddingCollaborator.value = true

  try {
    const ok = await skillsStore.addCollaborator(skillId.value, name)
    if (!ok) {
      globalToast.error(skillsStore.error || t('collab.addFailed'))
      return
    }
    collaboratorPickerRef.value?.rememberRecent(name)
    showAddCollaboratorModal.value = false
    newCollaboratorUsername.value = ''
    globalToast.success(t('collab.addSuccess'))
  } finally {
    isAddingCollaborator.value = false
  }
}

async function removeCollaborator(userId: number) {
  if (!confirm(t('collab.removeConfirm'))) return

  try {
    await skillsStore.removeCollaborator(skillId.value, userId)
    globalToast.success(t('collab.removeSuccess'))
  } catch (err) {
    globalToast.error(t('collab.removeFailed'))
  }
}

async function submitDeleteSkill() {
  const confirmValue = deleteConfirmInput.value.trim()
  if (confirmValue !== String(skill.value?.id)) return

  try {
    const ok = await skillsStore.deleteSkill(skillId.value, confirmValue)
    if (!ok) {
      throw new Error(skillsStore.error || t('collab.deleteFailed'))
    }

    showDeleteModal.value = false
    deleteConfirmInput.value = ''
    router.push('/')
  } catch (err) {
    globalToast.error(t('collab.deleteFailed'))
  }
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  // 全屏时禁止页面滚动
  document.body.style.overflow = isFullscreen.value ? 'hidden' : ''
}

function handleEscKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (lightboxShotId.value) {
    closeLightbox()
    return
  }
  if (isFullscreen.value) {
    toggleFullscreen()
  }
}

function openEditSkillDescription() {
  editVersionMode.value = 'description'
  editVersionForm.value = {
    version: '',
    description: skill.value?.description ?? '',
    changelog: ''
  }
  showEditVersionModal.value = true
}

function openEditVersionModal(v: SkillVersion, mode: 'changelog') {
  editVersionMode.value = mode
  editVersionForm.value = {
    version: v.version,
    description: '',
    changelog: v.changelog || ''
  }
  showEditVersionModal.value = true
}

async function submitEditVersion() {
  if (editVersionMode.value === 'changelog' && !editVersionForm.value.version) return

  isEditingVersion.value = true
  try {
    if (editVersionMode.value === 'description') {
      await skillsStore.updateSkill(skillId.value, { description: editVersionForm.value.description })
    } else {
      const prev = versions.value.find(v => v.version === editVersionForm.value.version)
      const updated = await versionsApi.update(skillId.value, editVersionForm.value.version, {
        description: prev?.description,
        changelog: editVersionForm.value.changelog
      })
      const idx = versions.value.findIndex(v => v.version === updated.version)
      if (idx !== -1) {
        versions.value[idx] = { ...versions.value[idx], ...updated }
      }
    }

    showEditVersionModal.value = false
    globalToast.success(t('skill.editVersionSuccess'))
  } catch (err: any) {
    globalToast.error(err.message || t('skill.editVersionFailed'))
  } finally {
    isEditingVersion.value = false
  }
}

async function setHeadVersion(version: string) {
  if (!confirm(`确定将 ${version} 设置为 Head 版本吗？`)) return
  try {
    const res = await skillsApi.setHead(skillId.value, version)
    if (res.ok && skill.value) {
      skill.value.latest_version = res.latest_version
      globalToast.success('设置成功')
    }
  } catch (err: any) {
    globalToast.error(err.message || '设置失败')
  }
}



</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.skill-btn-neon-glow {
  box-shadow: 0 0 15px rgba(var(--color-neon-rgb), 0.12);
}
.skill-btn-neon-glow:hover {
  box-shadow: 0 0 20px rgba(var(--color-neon-rgb), 0.22);
}
.skill-timeline-dot-glow {
  box-shadow: 0 0 8px rgba(var(--color-neon-rgb), 0.45);
}
.skill-icon-btn-neon-hover:hover {
  box-shadow: 0 0 10px rgba(var(--color-neon-rgb), 0.18);
}

.card {
  background-color: var(--color-base-900);
  border: 1px solid var(--color-base-800);
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

html[data-theme="light"] .card {
  box-shadow: 0 12px 32px -12px rgba(0, 0, 0, 0.12);
}

/* Markdown preview styles */
.markdown-body {
  color: var(--color-fg);
  line-height: 1.8;
  max-width: 100%;
  overflow-wrap: break-word;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  font-weight: 700;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: var(--color-fg-strong);
}

.markdown-body :deep(h1) { font-size: 1.5rem; }
.markdown-body :deep(h2) { font-size: 1.25rem; border-bottom: 1px solid var(--color-base-800); padding-bottom: 0.3em; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) { padding-left: 2em; margin-bottom: 1em; }
.markdown-body :deep(li) { margin-bottom: 0.25em; list-style: disc; }
.markdown-body :deep(p) { margin-bottom: 1em; }
.markdown-body :deep(a) { color: var(--color-neon-400); text-decoration: underline; text-underline-offset: 4px; }
.markdown-body :deep(code) {
  background-color: var(--color-base-950);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.875em;
  border: 1px solid var(--color-base-800);
}
.markdown-body :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
}
.markdown-body :deep(pre) {
  background-color: var(--color-base-950);
  border: 1px solid var(--color-base-800);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.markdown-body :deep(pre) code {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
}
.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--color-base-800);
  padding-left: 1em;
  color: var(--color-base-400);
  margin: 1em 0;
}
.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--color-base-800);
  padding: 0.5em 1em;
  text-align: left;
}
.markdown-body :deep(th) {
  background-color: var(--color-base-950);
}

/* 按逻辑行渲染：行号与该行首对齐，长行仅在右侧折行（与常见编辑器换行行为一致） */
.code-line-grid {
  width: 100%;
  max-width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  padding: 1.5rem;
  background-color: var(--color-base-950);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

.code-line-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  min-height: 1.6em;
}

.line-gutter {
  flex-shrink: 0;
  min-width: 2.5rem;
  text-align: right;
  color: var(--color-base-400);
  user-select: none;
  padding-right: 0.75rem;
  border-right: 1px solid var(--color-base-800);
  box-sizing: border-box;
}

.line-code {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  text-align: left;
  color: var(--color-fg);
  background: none;
  border: none;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
}

.line-code-hl :deep(.hljs) {
  background: transparent;
  padding: 0;
}

/* Markdown view buttons */
.md-view-btn {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-family: "JetBrains Mono", monospace;
  border: 1px solid var(--color-base-800);
  background: transparent;
  color: var(--color-base-400);
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.md-view-btn:hover {
  color: var(--color-fg-strong);
  border-color: var(--color-base-400);
}

.md-view-btn.is-active {
  background: rgba(var(--color-neon-rgb), 0.1);
  color: var(--color-neon-400);
  border: 1px solid var(--color-neon-500);
}

.skill-meta-chip,
.skill-tag-chip,
.skill-collection-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  font-family: inherit;
  font-size: 0.75rem;
  line-height: 1;
  padding: 0.45rem 0.75rem;
}

.skill-meta-chip {
  color: var(--color-base-400);
  background: color-mix(in srgb, var(--color-base-950) 88%, transparent);
  border: 1px solid var(--color-base-800);
}

.skill-meta-chip-favorite {
  padding: 0.4rem 0.55rem;
}

.skill-favorite-icon {
  width: 1.125rem;
  height: 1.125rem;
  display: block;
  flex-shrink: 0;
  overflow: visible;
}

.skill-meta-chip-action {
  color: var(--color-neon-400);
  background: rgba(var(--color-neon-rgb), 0.08);
  border-color: rgba(var(--color-neon-rgb), 0.25);
  cursor: pointer;
  transition: all 0.2s ease;
}

.skill-meta-chip--favorited {
  color: #ff75b5;
  background: rgba(255, 117, 181, 0.08);
  border-color: rgba(255, 117, 181, 0.25);
}

.skill-meta-chip-action:hover {
  background: rgba(var(--color-neon-rgb), 0.14);
}

.skill-meta-chip-private {
  color: #fcd34d;
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.3);
}

.skill-meta-chip--favorited:hover {
  background: rgba(255, 117, 181, 0.14);
}

.skill-tag-chip {
  color: var(--color-neon-400);
  background: rgba(var(--color-neon-rgb), 0.08);
  border: 1px solid rgba(var(--color-neon-rgb), 0.2);
}

.skill-collection-chip {
  color: #fcd34d;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.22);
}

/* Overlapping avatars share one baseline; the owner always comes first. */
.skill-contributors { display: flex; align-items: center; gap: 12px; margin-top: 20px; }
.skill-contributors-label { color: var(--color-base-400); font-size: 12px; flex-shrink: 0; }


/* Detail tabs */
.detail-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--color-base-800);
  padding-bottom: 0;
}

.detail-tab-btn {
  padding: 0.5rem 1rem;
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--color-base-400);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-tab-btn:hover {
  color: var(--color-fg-strong);
}

.detail-tab-btn--active {
  color: var(--color-neon-400);
  border-bottom-color: var(--color-neon-500);
}

/* Overview and installation stay together; the file reader is the main content. */
.skill-breadcrumb { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; font-size: 13px; color: var(--color-base-400); overflow-wrap: anywhere; }
.skill-breadcrumb a:hover { color: var(--color-fg-strong); }
.skill-detail-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; grid-template-rows: auto 1fr; column-gap: 48px; row-gap: 28px; align-items: start; }
.skill-hero { grid-column: 1; grid-row: 1; min-width: 0; }
.skill-detail-content { grid-column: 1; grid-row: 2; min-width: 0; }
.skill-summary { min-width: 0; }
.skill-title { margin: 0; font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; letter-spacing: -0.035em; line-height: 1.25; overflow-wrap: anywhere; }
.skill-desc-wrap { display: flex; align-items: flex-start; gap: 8px; margin: 16px 0 20px; }
.skill-desc { min-width: 0; flex: 1; font-size: 14px; line-height: 1.8; color: var(--color-fg); overflow-wrap: anywhere; }
.skill-desc-edit { margin-top: 2px; }
.skill-install-panel { grid-column: 2; grid-row: 1 / 3; min-width: 0; padding: 0; }
.skill-panel-title { margin-bottom: 16px; font-size: 15px; font-weight: 600; color: var(--color-fg-strong); }
.skill-field-label { display: block; font-size: 12px; color: var(--color-base-400); margin-bottom: 6px; }
.skill-install-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.skill-download-button, .skill-compare-button { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 12px; border-radius: 6px; font-size: 13px; cursor: pointer; transition: background-color 150ms; }
.skill-download-button { order: 1; background: var(--color-fg-strong); color: var(--color-base-950); border: 1px solid var(--color-fg-strong); }
.skill-download-button:hover { background: var(--color-fg); }
.skill-compare-button { order: 2; color: var(--color-base-400); }
.skill-compare-button:hover { color: var(--color-fg-strong); background: var(--color-base-900); }
.skill-file-workspace { display: grid; grid-template-columns: 180px minmax(0, 1fr); border: 0; border-radius: 0; overflow: hidden; margin-bottom: 24px; background: var(--color-base-950); }
.skill-file-tree, .skill-file-preview { display: flex; flex-direction: column; min-width: 0; height: 600px; }
.skill-file-tree { border-right: 1px solid var(--color-base-800); background: var(--color-base-900); }
.skill-file-toolbar { display: flex; align-items: center; min-height: 52px; padding: 10px 16px; border-bottom: 1px solid var(--color-base-800); color: var(--color-base-400); font-size: 13px; gap: 12px; }
.skill-preview-toolbar { justify-content: space-between; flex-wrap: wrap; }
.skill-preview-toolbar > div:first-child { min-width: 0; flex: 1; }
.skill-file-path { font-family: var(--font-mono); overflow-wrap: anywhere; font-size: 12px; color: var(--color-fg); }
.screenshot-showcase { margin-bottom: 24px; }
@media (max-width: 900px) {
  .skill-detail-layout { display: flex; flex-direction: column; gap: 28px; }
  .skill-detail-layout > * { width: 100%; }
  .skill-file-workspace { grid-template-columns: 190px minmax(0, 1fr); }
}
@media (max-width: 600px) {
  .skill-file-workspace { grid-template-columns: minmax(0, 1fr); }
  .skill-file-tree { height: 180px; border-right: 0; border-bottom: 1px solid var(--color-base-800); }
  .skill-file-preview { height: 520px; }
  .skill-preview-toolbar > div:first-child { flex-basis: 100%; }
  .detail-tab-btn { padding: 10px 12px; }
}

.screenshot-strip {
  display: flex;
  gap: 1.25rem;
  overflow-x: auto;
  padding: 0.5rem 0.25rem 0.75rem;
  scroll-snap-type: x proximity;
}

.screenshot-thumb {
  position: relative;
  flex-shrink: 0;
  margin: 0;
  overflow: hidden;
  scroll-snap-align: start;
}

.screenshot-img {
  height: 19rem;
  width: 100%;
  object-fit: contain;
  display: block;
  cursor: zoom-in;
}

.screenshot-delete-btn {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 9999px;
  border: none;
  background: rgba(0, 0, 0, 0.65);
  color: #f87171;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  opacity: 1;
  transition: opacity 0.15s;
}

.screenshot-thumb:hover .screenshot-delete-btn {
  opacity: 1;
}

/* Screenshot lightbox */
.screenshot-lightbox {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.screenshot-lightbox-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
}

.screenshot-lightbox-img {
  position: relative;
  max-width: 90vw;
  max-height: 85vh;
  border-radius: 0.5rem;
  box-shadow: none;
}

.screenshot-lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1.25rem;
  z-index: 1;
  background: transparent;
  border: none;
  color: var(--color-base-400);
  font-size: 2rem;
  cursor: pointer;
}

.screenshot-lightbox-close:hover {
  color: var(--color-fg-strong);
}

.screenshot-lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--color-base-800);
  color: var(--color-fg-strong);
  font-size: 1.75rem;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 9999px;
  cursor: pointer;
}

.screenshot-lightbox-prev { left: 1rem; }
.screenshot-lightbox-next { right: 1rem; }

.tag-option-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  color: var(--color-fg);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.875rem;
}

/* Fullscreen mode：整列阅读宽度上限 800px，水平居中 */
#file-preview-panel.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  max-height: none;
  min-height: 100vh;
  height: 100dvh;
  background: var(--color-base-950);
  border-radius: 0;
  border: none;
}

/* 不用 align-items:center，否则 flex-1 的 #file-content 竖向撑不满 */
#file-preview-panel.fullscreen > div:first-of-type,
#file-preview-panel.fullscreen > #file-content {
  max-width: 800px;
  width: 100%;
  box-sizing: border-box;
  margin-left: auto;
  margin-right: auto;
}

#file-preview-panel.fullscreen > div:first-of-type {
  flex-shrink: 0;
}

#file-preview-panel.fullscreen > #file-content {
  flex: 1 1 0;
  min-height: 0;
}

#file-preview-panel.fullscreen :deep(#file-content) {
  max-height: calc(100vh - 52px);
  overflow-y: auto;
  overflow-x: hidden;
}

/* Prevent double scrollbar in markdown preview */
#file-preview-panel.fullscreen :deep(#file-content) > .markdown-body {
  overflow: visible;
  max-height: none;
}

/* Ensure only file-content has scrollbar in fullscreen */
#file-preview-panel.fullscreen :deep(.markdown-body pre) {
  overflow: visible;
  white-space: pre-wrap;
  word-wrap: break-word;
}

#file-preview-panel.fullscreen .rounded-t-xl {
  border-radius: 0;
}

/* Cube Loader */
.cube-loader {
  width: 40px;
  height: 40px;
  position: relative;
  transform: rotateZ(45deg);
}

.cube-loader .cube {
  float: left;
  width: 50%;
  height: 50%;
  position: relative;
  transform: scale(1.1);
}

.cube-loader .cube:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--color-neon-400);
  animation: cube-fold 2.4s infinite linear both;
  transform-origin: 100% 100%;
}

.cube-loader .cube-2 {
  transform: scale(1.1) rotateZ(90deg);
}

.cube-loader .cube-3 {
  transform: scale(1.1) rotateZ(180deg);
}

.cube-loader .cube-4 {
  transform: scale(1.1) rotateZ(270deg);
}

.cube-loader .cube-2:before {
  animation-delay: 0.3s;
}

.cube-loader .cube-3:before {
  animation-delay: 0.6s;
}

.cube-loader .cube-4:before {
  animation-delay: 0.9s;
}

@keyframes cube-fold {
  0%, 10% {
    transform: perspective(140px) rotateX(-180deg);
    opacity: 0;
  }
  25%, 75% {
    transform: perspective(140px) rotateX(0deg);
    opacity: 1;
  }
  90%, 100% {
    transform: perspective(140px) rotateY(180deg);
    opacity: 0;
  }
}

/* Spinner */
.spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid rgba(var(--color-neon-rgb), 0.2);
  border-radius: 50%;
  border-top-color: var(--color-neon-400);
  animation: spin 1s linear infinite;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Ensure line numbers don't wrap */
.line-numbers {
  white-space: pre;
}

/* Modal styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.modal-content {
  position: relative;
  background-color: var(--color-base-900);
  border: 1px solid var(--color-base-800);
  border-radius: 0.75rem;
  width: 90%;
  max-width: 420px;
  padding: 1.5rem;
  color: var(--color-fg);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-fg-strong);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--color-base-400);
  font-size: 1.5rem;
  cursor: pointer;
}

.modal-close:hover {
  color: var(--color-fg-strong);
}

.modal-body {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-base-400);
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  background-color: var(--color-base-950);
  border: 1px solid var(--color-base-800);
  border-radius: 0.5rem;
  color: var(--color-fg-strong);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.875rem;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-neon-500);
  box-shadow: 0 0 0 1px var(--color-neon-500);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.modal-footer .btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-family: "JetBrains Mono", monospace;
  cursor: pointer;
  border: none;
}

.modal-footer .btn-secondary {
  background: transparent;
  border: 1px solid var(--color-base-800);
  color: var(--color-fg-strong);
}

.modal-footer .btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.warning-text {
  color: #f87171;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}


.skill-desc--collapsed { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.description-toggle { display: block; margin: -8px 0 20px; color: var(--color-neon-400); font-size: 12px; cursor: pointer; }
.install-methods { display: flex; padding: 3px; border-radius: 7px; background: var(--color-base-900); border: 1px solid var(--color-base-800); }
.install-methods button { flex: 1; padding: 7px; font-size: 12px; border-radius: 5px; color: var(--color-base-400); cursor: pointer; }
.install-methods .is-selected { background: transparent; color: var(--color-fg-strong); border-bottom: 2px solid var(--color-fg-strong); }
.install-secondary-actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.install-hint, .preview-description { font-size: 12px; line-height: 1.7; color: var(--color-base-400); }
.install-content { border: 0; border-radius: 0; overflow: hidden; }
.install-content pre { margin: 0; padding: 12px; max-height: 125px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; font-family: var(--font-mono); font-size: 11px; line-height: 1.7; }
.install-copy { display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; padding: 8px; border-top: 1px solid var(--color-base-800); color: var(--color-neon-400); font-size: 12px; cursor: pointer; background: rgba(var(--color-neon-rgb), .04); }
.detail-tabs { overflow-x: auto; }
.detail-tab-btn { white-space: nowrap; }
.preview-description { margin: 12px 0; }
.preview-empty { padding: 64px 20px; text-align: center; border: 0; color: var(--color-base-400); font-size: 14px; }
.screenshot-open { display: block; width: 100%; cursor: zoom-in; }
.screenshot-thumb { width: auto; max-width: 100%; }
.screenshot-img { width: auto; max-width: 100%; }
.team-settings { max-width: 960px; margin-inline: auto; }
.team-settings-grid { display: grid; gap: 24px; }
.team-settings .font-mono { font-family: inherit; }
.team-settings-grid > div { background: transparent; border: 0; border-radius: 0; }
.team-settings-grid > div > div { padding-left: 0; padding-right: 0; }
.team-settings-grid select, .team-settings-grid input { max-width: 580px; display: block; font-size: 13px; }
.team-settings-grid button.w-full { width: auto; padding-inline: 16px; }
.team-settings-grid p { font-size: 12px; }
.danger-setting { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 24px; padding: 20px 0; border-top: 1px solid var(--color-base-800); }
.danger-setting h3 { font-size: 14px; font-weight: 600; }
.danger-setting p { font-size: 12px; color: var(--color-base-400); margin-top: 6px; }
.danger-button { flex-shrink: 0; border: 1px solid #ef444450; border-radius: 6px; color: #ef4444; font-size: 12px; padding: 8px 14px; cursor: pointer; }
@media (max-width: 600px) { .danger-setting { align-items: flex-start; flex-direction: column; } .skill-hero { gap: 20px; } }
.skill-detail-content > div > .bg-base-900 { background: transparent; border: 0; border-radius: 0; }
.install-methods { background: transparent; border: 0; border-bottom: 1px solid var(--color-base-800); border-radius: 0; padding: 0; }
.install-methods button { border-radius: 0; }
.skill-file-tree { background: transparent; }
</style>
