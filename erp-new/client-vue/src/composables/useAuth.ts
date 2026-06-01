import { computed, ref } from 'vue';
import { api, clearAuth, getAuthToken, setAuthToken, setErpUserId } from '@/api';
import type { ErpUser } from '@/api/types';

const user = ref<ErpUser | null>(null);
const ready = ref(false);

export function isLoggedIn(): boolean {
  return !!getAuthToken();
}

export async function login(usrId: string, password = '') {
  const { data } = await api.authLogin({ usr_id: usrId.trim(), password });
  setAuthToken(data.token);
  setErpUserId(data.user.usr_id);
  user.value = data.user;
  ready.value = true;
  return data.user;
}

export async function logout() {
  try {
    await api.authLogout();
  } catch {
    /* ignore */
  }
  clearAuth();
  user.value = null;
  ready.value = false;
}

export async function fetchCurrentUser() {
  if (!getAuthToken()) {
    user.value = null;
    ready.value = true;
    return null;
  }
  try {
    const { data } = await api.authMe();
    user.value = data;
    setErpUserId(data.usr_id);
  } catch {
    clearAuth();
    user.value = null;
  } finally {
    ready.value = true;
  }
  return user.value;
}

export function useAuth() {
  return {
    user,
    ready,
    isLoggedIn: computed(() => !!user.value && !!getAuthToken()),
    login,
    logout,
    refresh: fetchCurrentUser,
  };
}

export { user as authUser };
