import { createRouter, createWebHistory } from 'vue-router'
// import LandingView from '@/views/LandingView.vue'
import HomeView from '@/views/HomeView.vue'

// Keep the landing route small. Detail, publishing and admin views are loaded
// only when the user navigates to them, instead of inflating the first-load
// JavaScript bundle for every visitor.
const CollectionsListView = () => import('@/views/CollectionsListView.vue')
const CollectionDetailView = () => import('@/views/CollectionDetailView.vue')
const LoginView = () => import('@/views/LoginView.vue')
const SkillDetailView = () => import('@/views/SkillDetailView.vue')
const PublishView = () => import('@/views/PublishView.vue')
const SettingsView = () => import('@/views/SettingsView.vue')
const CliCodeView = () => import('@/views/CliCodeView.vue')
const SetupView = () => import('@/views/SetupView.vue')
const DiffView = () => import('@/views/DiffView.vue')
const UserManagementView = () => import('@/views/UserManagementView.vue')
const TagManagementView = () => import('@/views/TagManagementView.vue')
const CollectionManagementView = () => import('@/views/CollectionManagementView.vue')
import { useAuthStore } from '@/stores/auth'
import { appBasePath } from '@/utils/basePath'

const router = createRouter({
  history: createWebHistory(appBasePath),
  routes: [
    {
      path: '/',
      name: '',
      component: HomeView,
    },
    {
      path: '/collections',
      name: 'collections',
      component: CollectionsListView,
    },
    {
      path: '/collections/:id',
      name: 'collection-detail',
      component: CollectionDetailView,
    },
    // {
    //   path: '/landing',
    //   name: 'landing',
    //   component: LandingView,
    // },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/skills/:id',
      name: 'skill-detail',
      component: SkillDetailView,
    },
    {
      path: '/users/:id',
      name: 'user-profile',
      component: () => import('@/views/UserProfileView.vue'),
    },
    {
      path: '/publish',
      name: 'publish',
      component: PublishView,
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/cli-code',
      name: 'cli-code',
      component: CliCodeView,
    },
    {
      path: '/setup',
      name: 'setup',
      component: SetupView,
    },
    {
      path: '/diff',
      name: 'diff',
      component: DiffView,
    },
    {
      path: '/admin/users',
      name: 'user-management',
      component: UserManagementView,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/tags',
      name: 'tag-management',
      component: TagManagementView,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/collections',
      name: 'collection-management',
      component: CollectionManagementView,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth && !to.meta.requiresAdmin && !to.meta.requiresSuperAdmin) {
    return true
  }

  const authStore = useAuthStore()
  const isAuthenticated = await authStore.fetchUser({ force: true })

  if (!isAuthenticated) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    }
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { path: '/' }
  }

  if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
    return { path: '/' }
  }

  return true
})

export default router
