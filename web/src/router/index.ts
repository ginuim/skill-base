import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '@/views/LandingView.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import SkillDetailView from '@/views/SkillDetailView.vue'
import PublishView from '@/views/PublishView.vue'
import SettingsView from '@/views/SettingsView.vue'
import CliCodeView from '@/views/CliCodeView.vue'
import SetupView from '@/views/SetupView.vue'
import DiffView from '@/views/DiffView.vue'
import UserManagementView from '@/views/UserManagementView.vue'
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
      path: '/landing',
      name: 'landing',
      component: LandingView,
    },
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
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth && !to.meta.requiresAdmin) {
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

  return true
})

export default router
