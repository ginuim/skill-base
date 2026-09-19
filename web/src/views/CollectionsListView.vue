<template>
  <main class="collections-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
    <header class="collections-page-header">
      <h1 class="collections-page-title">{{ t('collections.title') }}</h1>
      <p class="collections-page-subtitle">{{ t('collections.subtitle') }}</p>
    </header>

    <div v-if="isLoading" class="collections-shelf" :class="shelfLayoutClass(1)">
      <div class="collection-shelf-item">
        <CollectionBookCover loading size="sm" />
      </div>
    </div>

    <div v-else-if="collections.length === 0" class="empty-state">
      <div class="empty-state-icon">
        <Package :size="40" :stroke-width="1.5" aria-hidden="true" />
      </div>
      <p class="collections-empty-title">{{ t('collections.empty') }}</p>
      <p class="collections-empty-hint">{{ t('collections.emptyHint') }}</p>
      <router-link
        v-if="authStore.isAdmin"
        to="/admin/collections"
        class="btn btn-primary mt-6"
      >
        {{ t('collections.emptyAdminCta') }}
      </router-link>
    </div>

    <div v-else class="collections-shelf" :class="shelfLayoutClass(collections.length)">
      <router-link
        v-for="collection in collections"
        :key="collection.id"
        :to="`/collections/${collection.id}`"
        class="collection-shelf-item collection-shelf-link"
      >
        <CollectionBookCover
          :collection="collection"
          size="sm"
          interactive
        />
      </router-link>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Package } from 'lucide-vue-next'
import CollectionBookCover from '@/components/CollectionBookCover.vue'
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'
import { collectionsApi, type Collection } from '@/services/api'

const { t } = useI18n()
const authStore = useAuthStore()
const collections = ref<Collection[]>([])
const isLoading = ref(true)

function shelfLayoutClass(count: number) {
  if (count <= 1) return 'collections-shelf--single'
  if (count === 2) return 'collections-shelf--pair'
  return ''
}

onMounted(async () => {
  try {
    const res = await collectionsApi.list()
    collections.value = res.collections || []
  } catch {
    collections.value = []
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.collections-page-header {
  margin: 12px 0 36px;
}

.collections-page-title {
  font-size: 28px;
  font-weight: 650;
  color: var(--color-fg-strong);
  letter-spacing: -0.03em;
}

.collections-page-subtitle {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-base-400);
}

.collections-shelf {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13.5rem, 1fr));
  justify-items: start;
  gap: 40px 32px;
  max-width: 100%;
  margin: 0 auto;
}

.collections-shelf--single,
.collections-shelf--pair {
  grid-template-columns: repeat(var(--collection-count, 1), minmax(13.5rem, 17rem));
  justify-content: start;
  gap: 40px 32px;
}

.collections-shelf--pair {
  --collection-count: 2;
}

.collections-shelf--single .collection-shelf-item {
  max-width: 17rem;
}

.collections-shelf--pair .collection-shelf-item {
  max-width: 15.5rem;
}

.collection-shelf-item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 13.5rem;
  text-align: center;
}

.collection-shelf-link {
  text-decoration: none;
  color: inherit;
  outline: none;
  border-radius: 0.65rem;
}

.collection-shelf-link:focus-visible {
  outline: 2px solid var(--color-neon-400);
  outline-offset: 2px;
}

@media (max-width: 639px) {
  .collections-page-title {
    font-size: 24px;
  }

  .collections-shelf {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 2rem;
  }

  .collections-shelf--pair {
    grid-template-columns: 1fr;
  }
}

.empty-state-icon svg {
  display: inline-block;
}

.collections-empty-title {
  margin: 0 0 0.75rem;
  font-size: 0.9375rem;
  color: var(--color-fg-strong);
}

.collections-empty-hint {
  margin: 0 auto;
  max-width: 28rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--color-base-400);
}

</style>
