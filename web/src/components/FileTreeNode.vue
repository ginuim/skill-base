<template>
  <div :class="{ 'file-tree-folder': node.type === 'directory' }">
    <!-- Directory -->
    <div
      v-if="node.type === 'directory'"
      class="file-tree-item"
      @click="toggleFolder"
    >
      <ChevronDown
        class="w-4 h-4 opacity-70 flex-shrink-0 text-neon-400 transition-transform"
        :class="node.isOpen ? '' : '-rotate-90'"
        :size="16"
        :stroke-width="2"
        aria-hidden="true"
      />
      <Folder class="w-4 h-4 opacity-70 flex-shrink-0 text-yellow-400" :size="16" :stroke-width="2" aria-hidden="true" />
      <span class="name font-medium truncate">{{ node.name }}</span>
    </div>

    <!-- File -->
    <div
      v-else
      class="file-tree-item"
      :class="{ selected: selectedPath === node.path }"
      @click="selectFile"
    >
      <FileText
        class="w-4 h-4 opacity-70 flex-shrink-0"
        :class="selectedPath === node.path ? 'text-neon-400' : 'text-base-400'"
        :size="16"
        :stroke-width="2"
        aria-hidden="true"
      />
      <span class="name truncate">{{ node.name }}</span>
    </div>

    <!-- Recursive children -->
    <ul v-if="node.type === 'directory' && node.isOpen && node.children?.length" class="children-list">
      <li v-for="child in node.children" :key="child.path">
        <FileTreeNode
          :node="child"
          :selected-path="selectedPath"
          @select="$emit('select', $event)"
          @toggle="$emit('toggle', $event)"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown, Folder, FileText } from 'lucide-vue-next'
import FileTreeNode from './FileTreeNode.vue'

export interface TreeNode {
  type: 'directory' | 'file'
  name: string
  path: string
  children?: TreeNode[]
  isOpen?: boolean
}

interface Props {
  node: TreeNode
  selectedPath?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [node: TreeNode]
  toggle: [node: TreeNode]
}>()

function toggleFolder() {
  emit('toggle', props.node)
}

function selectFile() {
  emit('select', props.node)
}
</script>

<style scoped>
.file-tree-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  cursor: pointer;
  color: var(--color-base-400);
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.file-tree-item:hover,
.file-tree-item.selected {
  color: var(--color-neon-400);
  background-color: rgba(var(--color-neon-rgb), 0.1);
}

.file-tree-item .name {
  font-size: 0.875rem;
}

.file-tree-item.selected {
  font-weight: 500;
}

.file-tree-folder > .file-tree-item {
  color: var(--color-fg-strong);
}

.children-list {
  list-style: none;
  margin: 0;
  padding-left: 1.5rem;
  position: relative;
}

.children-list::before {
  content: '';
  position: absolute;
  left: 1rem;
  top: 0;
  bottom: 0.75rem;
  width: 1px;
  background-color: var(--color-base-800);
}
</style>
