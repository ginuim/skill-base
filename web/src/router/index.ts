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
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
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
    },
  ],
})

export default router
