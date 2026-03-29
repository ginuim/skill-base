<template>
  <div :class="{ 'file-tree-folder': node.type === 'directory' }">
    <!-- Directory -->
    <div
      v-if="node.type === 'directory'"
      class="file-tree-item"
      @click="toggleFolder"
    >
      <svg
        class="w-4 h-4 opacity-70 flex-shrink-0 text-neon-400 transition-transform"
        :class="node.isOpen ? '' : '-rotate-90'"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
      <svg class="w-4 h-4 opacity-70 flex-shrink-0 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
      </svg>
      <span class="name font-medium truncate">{{ node.name }}</span>
    </div>

    <!-- File -->
    <div
      v-else
      class="file-tree-item"
      :class="{ selected: selectedPath === node.path }"
      @click="selectFile"
    >
      <svg class="w-4 h-4 opacity-70 flex-shrink-0" :class="selectedPath === node.path ? 'text-neon-400' : 'text-base-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
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
  color: #a1a1aa;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.file-tree-item:hover,
.file-tree-item.selected {
  color: #00FFA3;
  background-color: rgba(0, 255, 163, 0.05);
}

.file-tree-item .name {
  font-size: 0.875rem;
}

.file-tree-item.selected {
  font-weight: 500;
}

.file-tree-folder > .file-tree-item {
  color: white;
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
  background-color: #27272a;
}
</style>
