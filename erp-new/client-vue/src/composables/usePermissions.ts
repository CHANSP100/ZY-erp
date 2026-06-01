import { computed } from 'vue';
import { authUser } from '@/composables/useAuth';
import { pathToPgm } from '@/config/menuRegistry';
import type { MenuPermissionFlags } from '@/api/types';

const EMPTY: MenuPermissionFlags = {
  dsp: false,
  apd: false,
  upd: false,
  del: false,
  prt: false,
};

export function usePermissions() {
  const permissions = computed(() => authUser.value?.permissions ?? null);

  const isAdmin = computed(() => permissions.value?.is_admin ?? authUser.value?.is_admin ?? false);

  function menuPerm(pgm: string): MenuPermissionFlags {
    if (isAdmin.value) {
      return { dsp: true, apd: true, upd: true, del: true, prt: true };
    }
    const m = permissions.value?.menus.find((x) => x.pgm === pgm);
    return m ? { dsp: m.dsp, apd: m.apd, upd: m.upd, del: m.del, prt: m.prt } : { ...EMPTY };
  }

  function canDsp(pgm: string) {
    return menuPerm(pgm).dsp;
  }
  function canApd(pgm: string) {
    return menuPerm(pgm).apd;
  }
  function canUpd(pgm: string) {
    return menuPerm(pgm).upd;
  }
  function canDel(pgm: string) {
    return menuPerm(pgm).del;
  }
  function canPrt(pgm: string) {
    return menuPerm(pgm).prt;
  }

  function canAccessPath(path: string) {
    const pgm = pathToPgm(path);
    if (!pgm) return true;
    return canDsp(pgm);
  }

  return {
    permissions,
    isAdmin,
    menuPerm,
    canDsp,
    canApd,
    canUpd,
    canDel,
    canPrt,
    canAccessPath,
  };
}
