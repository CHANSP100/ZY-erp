import { ref } from 'vue';
import { api, getAuthToken, setErpUserId } from '@/api';
import type { ErpUser } from '@/api/types';
import { authUser, fetchCurrentUser } from '@/composables/useAuth';

const users = ref<ErpUser[]>([]);
const ready = ref(false);

export async function initErpUser() {
  if (!getAuthToken()) {
    ready.value = true;
    return;
  }
  try {
    await fetchCurrentUser();
    const { data: list } = await api.authUsers();
    users.value = list;
  } catch {
  } finally {
    ready.value = true;
  }
}

const user = authUser;

export async function switchErpUser(usrId: string) {
  setErpUserId(usrId);
  await initErpUser();
  window.location.reload();
}

export function useErpUser() {
  return { user, users, ready, switchUser: switchErpUser, refresh: initErpUser };
}
