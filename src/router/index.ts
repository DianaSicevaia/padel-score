import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import DashboardView from '../views/DashboardView.vue'
import MyClubView from '../views/MyClubView.vue'
import ClubView from '../views/ClubView.vue'
import SettingsView from '../views/SettingsView.vue'
import MatchesView from '../views/MatchesView.vue'
import QuickMatchView from '../views/QuickMatchView.vue'
import NotificationsView from '../views/NotificationsView.vue'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
      meta: {
        guestOnly: true,
      },
    },
    {
      path: '/register',
      component: RegisterView,
      meta: { guestOnly: true },
    },
    {
      path: '/forgot-password',
      component: ForgotPasswordView,
      meta: { guestOnly: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/my-club',
      name: 'my-club',
      component: MyClubView,
      meta: { requiresAuth: true },
    },
    {
      path: '/clubs/:id',
      name: 'club',
      component: ClubView,
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/matches',
      name: 'matches',
      component: MatchesView,
      meta: { requiresAuth: true },
    },
    {
      path: '/matches/new',
      name: 'quick-match',
      component: QuickMatchView,
      meta: { requiresAuth: true },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: NotificationsView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore(pinia)

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/'
  }

  if (to.path === '/' && authStore.isAuthenticated) {
    return '/dashboard'
  }
})

export default router
