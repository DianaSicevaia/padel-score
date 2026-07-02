import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { pinia } from './stores'

const bootstrap = async () => {
  const app = createApp(App)

  app.use(pinia)

  const authStore = useAuthStore(pinia)
  await authStore.init()
  authStore.checkExpiry()

  app.use(router)
  app.mount('#app')
}

bootstrap()
