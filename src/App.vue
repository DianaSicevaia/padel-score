<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'
import { useClubsStore } from '@/stores/clubs'
import { useNotificationsStore } from '@/stores/notifications'

// App-wide live data — started once per session (not per page) so the bell
// badge, "my clubs" list, and the users cache stay in sync in real time
// without every view managing its own subscription.
const authStore = useAuthStore()
const usersStore = useUsersStore()
const clubsStore = useClubsStore()
const notificationsStore = useNotificationsStore()

let unsubs: (() => void)[] = []

const stopAll = () => {
  for (const unsub of unsubs) unsub()
  unsubs = []
}

const startAll = (uid: string) => {
  stopAll()
  unsubs = [
    usersStore.subscribeAll(),
    clubsStore.subscribeMyClubs(),
    notificationsStore.subscribeNotifications(uid),
  ]
}

watch(
  () => authStore.user?.uid ?? null,
  (uid) => {
    if (uid) startAll(uid)
    else stopAll()
  },
  { immediate: true },
)

onUnmounted(stopAll)
</script>

<template>
  <RouterView />
</template>
