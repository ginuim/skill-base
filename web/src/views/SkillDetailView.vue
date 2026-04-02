<template>
  <div class="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
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
          <svg class="w-10 h-10 text-base-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">{{ t('skill.notFound') }}</h3>
        <p class="text-base-400 mb-6">{{ t('skill.notFoundDesc') }}</p>
        <router-link to="/" class="btn-primary px-6 py-3 rounded-lg">
          {{ t('skill.backToHome') }}
        </router-link>
      </div>

      <!-- Skill Detail -->
      <template v-else>
        <!-- Breadcrumb -->
        <div class="text-sm text-base-400 font-mono mb-6 flex items-center gap-2">
          <span class="text-neon-400">~</span>
          <span class="opacity-50">/</span>
          <router-link to="/" class="hover:text-white transition-colors">{{ t('skill.breadcrumbHome') }}</router-link>
          <span class="opacity-50">/</span>
          <span class="text-white">{{ skill.name }}</span>
        </div>

        <!-- Skill Info Card -->
        <div id="skill-info" class="card p-6 mb-6 relative overflow-hidden">
          <div class="absolute top-0 right-0 bg-base-800 text-base-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg opacity-50 select-none">ID: {{ skill.id.toString().substring(0, 8) }}</div>
          <h1 class="text-3xl font-bold text-white mb-3 flex items-center gap-3">
            <span class="text-neon-400 font-mono font-normal opacity-70">&gt;</span>
            {{ skill.name }}
          </h1>
          <div class="flex items-start justify-between mb-6 group">
            <p class="text-base-400 text-sm leading-relaxed max-w-5xl whitespace-pre-wrap">
              {{ currentVersionObj?.description || skill.description || t('state.noDesc') }}
            </p>
            <button
              v-if="canManageCollaborators && currentVersionObj"
              @click="openEditVersionModal(currentVersionObj, 'description')"
              class="opacity-0 group-hover:opacity-100 p-1.5 text-base-400 hover:text-neon-400 transition-all flex-shrink-0 bg-base-950 border border-base-800 rounded ml-4"
              title="Edit Version Info"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
          </div>

          <!-- Version Select & Actions -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-base-800">
            <div class="relative w-full sm:flex-1 sm:max-w-md">
              <select
                v-model="currentVersion"
                @change="onVersionChange"
                class="w-full appearance-none bg-base-950 border border-base-800 text-white font-mono text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500 transition-colors cursor-pointer"
              >
                <option v-for="(v, index) in versions" :key="v.id" :value="v.version">
                  {{ v.version }} {{ index === 0 ? t('skill.latestTag') : '' }}
                </option>
              </select>
              <svg class="w-4 h-4 absolute right-4 top-3 pointer-events-none text-base-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 sm:mt-0 flex-shrink-0">
              <button
                @click="goToDiff"
                class="flex items-center justify-center gap-2 bg-transparent text-white border border-base-800 hover:bg-base-800 text-sm font-mono px-5 py-2.5 rounded-lg transition-colors w-full sm:w-auto"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                </svg>
                {{ t('skill.compare') }}
              </button>
              <button
                @click="downloadCurrentVersion"
                class="flex items-center justify-center gap-2 bg-transparent border border-neon-500 text-neon-400 hover:bg-neon-400/10 text-sm font-mono px-5 py-2.5 rounded-lg transition-colors w-full sm:w-auto shadow-[0_0_15px_rgba(0,255,163,0.1)] hover:shadow-[0_0_20px_rgba(0,255,163,0.2)]"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                {{ t('skill.download') }}
              </button>
            </div>
          </div>
        </div>

        <!-- File Tree & Preview (1:3 ratio) -->
        <section class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <!-- Left: File Tree -->
          <div class="bg-base-900 border border-base-800 rounded-xl flex flex-col min-h-[400px] max-h-[500px]">
            <div class="px-5 py-3 border-b border-base-800 font-mono text-sm text-base-400 flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-base-800"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-base-800"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-base-800"></span>
              <span class="ml-2 text-white/50">ls -la</span>
            </div>
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
          <div id="file-preview-panel" :class="['lg:col-span-3 bg-base-900 border border-base-800 rounded-xl flex flex-col min-h-[400px] max-h-[500px]', { 'fullscreen': isFullscreen }]">
            <div class="px-5 py-3 border-b border-base-800 text-sm font-mono text-base-400 bg-base-950/50 rounded-t-xl flex justify-between items-center">
              <div>
                <span>cat <span class="text-white/30">{{ selectedFilePath || '<file>' }}</span></span>
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
                  <svg v-if="!isFullscreen" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
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
              <div v-else-if="isMarkdownFile && markdownMode === 'source'" class="code-with-lines">
                <div class="line-numbers" aria-hidden="true">{{ markdownLineNumbers }}</div>
                <pre class="md-source-pre"><code>{{ normalizedSelectedFileContent }}</code></pre>
              </div>
              <div v-else-if="isTextFile" class="code-with-lines">
                <div class="line-numbers" aria-hidden="true">{{ fileLineNumbers }}</div>
                <pre><code ref="codeBlock">{{ normalizedSelectedFileContent }}</code></pre>
              </div>
              <div v-else class="flex flex-col items-center justify-center h-full">
                <p class="text-base-400 font-mono">{{ t('skill.binaryFile') }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Bottom Grid: Team (1/3) & Version History (2/3) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left: Collaborators -->
          <div class="bg-base-900 border border-base-800 rounded-xl h-fit">
            <div class="px-5 py-4 border-b border-base-800 font-mono font-semibold text-white flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <span class="text-neon-400">#</span> {{ t('skill.collaborators') }}
              </div>
              <button
                v-if="skillsStore.isOwner"
                @click="showAddCollaboratorModal = true"
                class="text-xs text-neon-400 hover:text-white transition-colors"
              >
                + {{ t('btn.add') }}
              </button>
            </div>
            <div class="p-5 flex flex-col gap-4">
              <!-- Owner -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="w-10 h-10 rounded-full bg-neon-400/20 flex items-center justify-center text-neon-400 font-bold text-sm">
                    {{ (skill.owner?.username || 'U').charAt(0).toUpperCase() }}
                  </span>
                  <div>
                    <div class="font-medium text-white text-sm">{{ skill.owner?.name || skill.owner?.username }}</div>
                    <div class="text-xs text-base-400">{{ skill.owner?.email || '' }}</div>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded text-xs font-mono bg-neon-400/10 text-neon-400 border border-neon-400/20">
                  {{ t('collab.owner') }}
                </span>
              </div>
              <!-- Collaborators -->
              <div
                v-for="collaborator in skill.collaborators"
                :key="collaborator.id"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-3">
                  <span class="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                    {{ (collaborator.username || 'U').charAt(0).toUpperCase() }}
                  </span>
                  <div>
                    <div class="font-medium text-white text-sm">{{ collaborator.name || collaborator.username }}</div>
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
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <!-- Danger Zone -->
            <div v-if="skillsStore.isOwner" class="px-5 pb-5 pt-0">
              <div class="border-t border-base-800 pt-4">
                <button
                  @click="showDeleteModal = true"
                  class="w-full py-2 text-xs font-mono text-red-500 border border-red-500/30 rounded bg-red-500/5 hover:bg-red-500/10 transition-colors"
                >
                  {{ t('skill.deleteSkill') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Right: Version History -->
          <div class="lg:col-span-2 bg-base-900 border border-base-800 rounded-xl">
            <div
              class="px-5 py-4 border-b border-base-800 flex items-center justify-between rounded-t-xl cursor-pointer hover:bg-white/5 transition-colors"
              @click="isVersionHistoryCollapsed = !isVersionHistoryCollapsed"
            >
              <div class="flex items-center gap-2 font-mono font-semibold text-white text-sm">
                <span class="text-neon-400">git</span> log
              </div>
              <span class="text-base-400 transition-transform" :class="isVersionHistoryCollapsed ? '-rotate-90' : ''">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </span>
            </div>
            <div v-if="!isVersionHistoryCollapsed" class="p-6 overflow-hidden">
              <div id="version-list" class="relative pl-6">
                <!-- Timeline line -->
                <div class="absolute left-[5px] top-0 bottom-2 w-px bg-base-800"></div>

                <div
                  v-for="(v, index) in versions"
                  :key="v.id"
                  class="relative mb-8 last:mb-0 group cursor-pointer"
                >
                  <!-- Timeline dot -->
                  <span
                    class="absolute -left-[21px] top-2 w-2.5 h-2.5 rounded-full ring-4 ring-base-900 transition-colors"
                    :class="v.version === skill.latest_version ? 'bg-neon-400 shadow-[0_0_8px_rgba(0,255,163,0.8)]' : 'bg-base-800 group-hover:bg-neon-500'"
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
                      <p class="text-sm font-medium mt-2" :class="v.version === skill.latest_version ? 'text-white' : 'text-base-200'">
                        {{ v.changelog || t('skill.noChangelog') }}
                      </p>
                      <p class="text-xs text-base-400 mt-1 flex items-center gap-1.5 font-mono">
                        by @{{ v.uploader?.name || v.uploader?.username || t('state.unknown') }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <span class="text-xs text-base-400 font-mono whitespace-nowrap text-right" :title="formatDateFull(v.created_at)">{{ formatDate(v.created_at) }}</span>
                      
                      <button
                        v-if="canManageCollaborators && v.version !== skill.latest_version"
                        title="Set as Head"
                        class="flex items-center justify-center p-2 text-base-400 border border-base-800 rounded bg-base-950 hover:text-neon-400 hover:border-neon-500 hover:bg-neon-400/10 transition-all"
                        @click.stop="setHeadVersion(v.version)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                        </svg>
                      </button>

                      <button
                        v-if="canManageCollaborators"
                        title="Edit Version"
                        class="flex items-center justify-center p-2 text-base-400 border border-base-800 rounded bg-base-950 hover:text-neon-400 hover:border-neon-500 hover:bg-neon-400/10 transition-all"
                        @click.stop="openEditVersionModal(v, 'changelog')"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>

                      <button
                        :title="t('skill.download')"
                        class="flex items-center justify-center p-2 text-base-400 border border-base-800 rounded bg-base-950 hover:text-neon-400 hover:border-neon-500 hover:bg-neon-400/10 hover:shadow-[0_0_10px_rgba(0,255,163,0.15)] transition-all"
                        @click.stop="downloadVersion(v.version)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
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
          <div class="form-group">
            <label>{{ t('collab.usernameLabel') }}</label>
            <input
              v-model="newCollaboratorUsername"
              type="text"
              :placeholder="t('collab.usernamePlaceholder')"
              class="form-input"
              @keyup.enter="submitAddCollaborator"
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
          <h3>{{ editVersionMode === 'description' ? t('skill.editVersionTitleDesc') : t('skill.editVersionTitleChangelog') }} ({{ editVersionForm.version }})</h3>
          <button class="modal-close" @click="showEditVersionModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="editVersionMode === 'description'" class="form-group">
            <label>{{ t('skill.editVersionLabelDescription') }}</label>
            <textarea
              v-model="editVersionForm.description"
              :placeholder="t('skill.editVersionPlaceholderDescription')"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSkillsStore } from '@/stores/skills'
import { useI18n } from '@/composables/useI18n'
import { versionsApi, skillsApi, type SkillVersion } from '@/services/api'
import { globalToast } from '@/composables/useToast'
import { marked } from 'marked'
import hljs from 'highlight.js'
import FileTreeNode, { type TreeNode } from '@/components/FileTreeNode.vue'
import { formatDate, formatDateFull } from '@/utils/date'

const route = useRoute()
const router = useRouter()
const skillsStore = useSkillsStore()
const { t } = useI18n()

const skillId = computed(() => route.params.id as string)
const skill = computed(() => skillsStore.currentSkill)

// Version management
const versions = ref<SkillVersion[]>([])
const currentVersion = ref<string>('')
const currentVersionObj = computed(() => {
  return versions.value.find(v => v.version === currentVersion.value)
})
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
const isVersionHistoryCollapsed = ref(false)
const showAddCollaboratorModal = ref(false)
const showDeleteModal = ref(false)
const showEditVersionModal = ref(false)
const editVersionMode = ref<'description' | 'changelog'>('description')
const editVersionForm = ref({ version: '', description: '', changelog: '' })
const isEditingVersion = ref(false)
const newCollaboratorUsername = ref('')
const isAddingCollaborator = ref(false)
const deleteConfirmInput = ref('')
const codeBlock = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)

function normalizeLineEndings(content: string) {
  return content.replace(/\r\n?/g, '\n')
}

function getLineCount(content: string) {
  if (!content) return 1
  return normalizeLineEndings(content).split('\n').length
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

const canManageCollaborators = computed(() => {
  if (!skill.value) return false
  return skill.value.permission === 'owner' || skill.value.permission === 'collaborator'
})

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

const markdownLineNumbers = computed(() => {
  const lines = getLineCount(selectedFileContent.value)
  return Array.from({ length: lines }, (_, i) => i + 1).join('\n')
})

const fileLineNumbers = computed(() => {
  const lines = getLineCount(selectedFileContent.value)
  return Array.from({ length: lines }, (_, i) => i + 1).join('\n')
})

onMounted(async () => {
  // Set page title
  document.title = t('skill.title')

  // Load skill
  await skillsStore.fetchSkill(skillId.value)

  // Load versions
  await loadVersions()

  // Load initial version
  if (versions.value.length > 0) {
    currentVersion.value = versions.value[0]!.version
    await loadVersionZip(currentVersion.value)
  }

  isInitializing.value = false

  // ESC 键退出全屏
  document.addEventListener('keydown', handleEscKey)
})

watch([() => codeBlock.value, () => normalizedSelectedFileContent.value], ([el]) => {
  if (el && isTextFile.value && !isMarkdownFile.value) {
    nextTick(() => {
      hljs.highlightElement(el)
    })
  }
})

async function loadVersions() {
  try {
    const response = await versionsApi.list(skillId.value)
    versions.value = response.versions || []
  } catch (err) {
    console.error('Failed to load versions:', err)
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
    // Backend returns the ZIP file directly, not a download URL
    const response = await fetch(versionsApi.downloadUrl(skillId.value, version), {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Failed to download version')
    }

    const zipData = await response.arrayBuffer()

    // Dynamic import JSZip
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(zipData)
    currentZip.value = zip

    // Generate file tree
    fileTree.value = generateFileTree(zip)
  } catch (err) {
    console.error('Failed to load version zip:', err)
    fileTree.value = []
  } finally {
    isLoadingZip.value = false
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

async function onFileSelect(node: TreeNode) {
  selectedFilePath.value = node.path

  if (!currentZip.value) return

  const file = currentZip.value.file(node.path)
  if (!file) return

  try {
    const content = await file.async('string')
    selectedFileContent.value = content

    if (isMarkdownFile.value) {
      markdownMode.value = 'render'
    }
  } catch (err) {
    // Binary file
    selectedFileContent.value = ''
  }
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
  if (!newCollaboratorUsername.value) return
  isAddingCollaborator.value = true

  try {
    await skillsStore.addCollaborator(skillId.value, newCollaboratorUsername.value)
    showAddCollaboratorModal.value = false
    newCollaboratorUsername.value = ''
    globalToast.success(t('collab.addSuccess'))
  } catch (err) {
    globalToast.error(t('collab.addFailed'))
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
  if (deleteConfirmInput.value !== String(skill.value?.id)) return

  try {
    await skillsStore.deleteSkill(skillId.value)
    showDeleteModal.value = false
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
  if (e.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}

function openEditVersionModal(v: SkillVersion, mode: 'description' | 'changelog') {
  editVersionMode.value = mode
  editVersionForm.value = {
    version: v.version,
    description: v.description || skill.value?.description || '',
    changelog: v.changelog || ''
  }
  showEditVersionModal.value = true
}

async function submitEditVersion() {
  if (!editVersionForm.value.version) return
  isEditingVersion.value = true
  try {
    const updated = await versionsApi.update(skillId.value, editVersionForm.value.version, {
      description: editVersionForm.value.description,
      changelog: editVersionForm.value.changelog
    })
    
    // 更新本地数据
    const idx = versions.value.findIndex(v => v.version === updated.version)
    if (idx !== -1) {
      versions.value[idx] = { ...versions.value[idx], ...updated }
    }
    
    // 如果编辑的是当前选中的版本且也需要更新全局技能信息（可根据需求，如果只编辑版本不需要更新全局）
    
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

.card {
  background-color: #13141a;
  border: 1px solid #27272a;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* Markdown preview styles */
.markdown-body {
  color: #e4e4e7;
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
  color: white;
}

.markdown-body :deep(h1) { font-size: 1.5rem; }
.markdown-body :deep(h2) { font-size: 1.25rem; border-bottom: 1px solid #27272a; padding-bottom: 0.3em; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) { padding-left: 2em; margin-bottom: 1em; }
.markdown-body :deep(li) { margin-bottom: 0.25em; list-style: disc; }
.markdown-body :deep(p) { margin-bottom: 1em; }
.markdown-body :deep(a) { color: #00FFA3; text-decoration: underline; text-underline-offset: 4px; }
.markdown-body :deep(code) {
  background-color: #09090b;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.875em;
  border: 1px solid #27272a;
}
.markdown-body :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
}
.markdown-body :deep(pre) {
  background-color: #09090b;
  border: 1px solid #27272a;
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.markdown-body :deep(pre) code {
  white-space: pre-wrap;
  word-wrap: break-word;
}
.markdown-body :deep(blockquote) {
  border-left: 4px solid #27272a;
  padding-left: 1em;
  color: #a1a1aa;
  margin: 1em 0;
}
.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #27272a;
  padding: 0.5em 1em;
  text-align: left;
}
.markdown-body :deep(th) {
  background-color: #09090b;
}

/* Code with line numbers */
.code-with-lines {
  display: flex;
  align-items: stretch;
  width: max-content;
  min-width: 100%;
  min-height: 100%;
  gap: 0.75rem;
  background-color: #09090b;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

.line-numbers {
  flex-shrink: 0;
  text-align: right;
  color: #52525b;
  user-select: none;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  white-space: pre;
  padding: 1.5rem 0.75rem 1.5rem 1.5rem;
  border-right: 1px solid #27272a;
}

.code-with-lines pre {
  margin: 0;
  flex: 1;
  min-width: 0;
  padding: 1.5rem !important;
  border: none !important;
  background: transparent !important;
  overflow-x: auto;
  font-family: inherit !important;
  font-size: inherit !important;
  line-height: inherit !important;
}

.code-with-lines pre code {
  font-family: inherit !important;
  font-size: inherit !important;
  line-height: inherit !important;
}

/* Markdown source preview */
.md-source-pre {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 1.5rem;
  background: transparent;
  border: none;
  overflow-x: auto;
  text-align: left;
}

.md-source-pre code {
  background: none;
  border: none;
  padding: 0;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #e4e4e7;
  white-space: pre;
}

/* Markdown view buttons */
.md-view-btn {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-family: "JetBrains Mono", monospace;
  border: 1px solid #27272a;
  background: transparent;
  color: #a1a1aa;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.md-view-btn:hover {
  color: white;
  border-color: #a1a1aa;
}

.md-view-btn.is-active {
  background: rgba(0, 255, 163, 0.1);
  color: #00FFA3;
  border: 1px solid #00E592;
}

/* Fullscreen mode */
#file-preview-panel.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  max-height: none;
  min-height: 100vh;
  border-radius: 0;
  border: none;
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

/* Fullscreen content width limit */
#file-preview-panel.fullscreen :deep(#file-content) > .markdown-body,
#file-preview-panel.fullscreen :deep(#file-content) > .code-with-lines,
#file-preview-panel.fullscreen :deep(#file-content) > pre {
  max-width: 120ch;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}

/* Word wrap for code and text content */
.code-with-lines pre code,
.md-source-pre code,
.code-with-lines pre {
  white-space: pre;
  word-wrap: normal;
  overflow-wrap: normal;
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
  background-color: #00FFA3;
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
  border: 3px solid rgba(0, 255, 163, 0.2);
  border-radius: 50%;
  border-top-color: #00FFA3;
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
  background-color: #13141a;
  border: 1px solid #27272a;
  border-radius: 0.75rem;
  width: 90%;
  max-width: 420px;
  padding: 1.5rem;
  color: #e4e4e7;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
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
  color: white;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: #a1a1aa;
  font-size: 1.5rem;
  cursor: pointer;
}

.modal-close:hover {
  color: white;
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
  color: #a1a1aa;
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  background-color: #09090b;
  border: 1px solid #27272a;
  border-radius: 0.5rem;
  color: white;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.875rem;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #00E592;
  box-shadow: 0 0 0 1px #00E592;
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
  border: 1px solid #27272a;
  color: white;
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
</style>
