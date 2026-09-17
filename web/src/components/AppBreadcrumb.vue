<template>
  <nav class="app-breadcrumb" aria-label="Breadcrumb">
    <ol class="app-breadcrumb-list">
      <li v-for="(item, index) in items" :key="`${item.label}-${index}`" class="app-breadcrumb-item">
        <router-link
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="app-breadcrumb-link"
        >{{ item.label }}</router-link>
        <span v-else class="app-breadcrumb-current">{{ item.label }}</span>
        <span v-if="index < items.length - 1" class="app-breadcrumb-sep" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
export interface BreadcrumbItem {
  label: string
  to?: string
}

defineProps<{
  items: BreadcrumbItem[]
}>()
</script>

<style scoped>
.app-breadcrumb {
  margin-bottom: 24px;
}
.app-breadcrumb-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  line-height: 20px;
}
.app-breadcrumb-item {
  display: inline-flex;
  align-items: center;
}
.app-breadcrumb-link {
  color: var(--color-fg-secondary);
  text-decoration: none;
  transition: color 150ms ease;
}
.app-breadcrumb-link:hover {
  color: var(--color-fg);
}
.app-breadcrumb-current {
  color: var(--color-fg);
}
.app-breadcrumb-sep {
  margin: 0 8px;
  color: var(--color-fg-subtle);
}
</style>
