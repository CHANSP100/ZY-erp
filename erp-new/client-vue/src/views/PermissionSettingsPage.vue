<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ErpBasePage from '@/components/erp/ErpBasePage.vue';
import ErpQueryBar from '@/components/erp/ErpQueryBar.vue';
import ErpQueryBarField from '@/components/erp/ErpQueryBarField.vue';
import ErpEditDialog from '@/components/erp/ErpEditDialog.vue';
import ErpFormSection from '@/components/erp/ErpFormSection.vue';
import { api } from '@/api';
import type { DeproLine, MenuCatalogItem, MenuPermissionRow, SysAuthUser } from '@/api/types';
import { useAuth } from '@/composables/useAuth';
import { apiErrorMessage } from '@/utils/sunlike';

const { user: currentUser, refresh: refreshAuth } = useAuth();

const activeTab = ref('users');
const loading = ref(false);

const users = ref<SysAuthUser[]>([]);
const catalog = ref<MenuCatalogItem[]>([]);
const whOptions = ref<{ wh: string; name: string }[]>([]);
const deptOptions = ref<{ dep: string; name: string }[]>([]);

const userQuery = reactive({ usr_id: '', name: '' });
const userDialog = ref(false);
const userSaving = ref(false);
const userEditing = ref<string | null>(null);
const userForm = reactive<SysAuthUser & { pwd?: string }>({
  usr_id: '',
  name: '',
  pwd: '',
  is_admin: false,
  dep: '',
  b_dat: '',
  e_dat: '',
  depro_no: '',
  rem: '',
  mng: '',
  tel1: '',
  e_mail: '',
});

const permUsrId = ref('');
const menuRows = ref<MenuPermissionRow[]>([]);
const menuSaving = ref(false);
const copyFromUsr = ref('');

const deproUsrId = ref('');
const deproNo = ref('');
const deproLines = ref<DeproLine[]>([]);
const deproSaving = ref(false);

const whUsrId = ref('');
const whSelected = ref<string[]>([]);
const whSaving = ref(false);

const filteredUsers = computed(() => {
  let rows = users.value;
  const u = userQuery.usr_id.trim().toLowerCase();
  const n = userQuery.name.trim().toLowerCase();
  if (u) rows = rows.filter((r) => r.usr_id.toLowerCase().includes(u));
  if (n) rows = rows.filter((r) => r.name.toLowerCase().includes(n));
  return rows;
});

function resetUserForm() {
  Object.assign(userForm, {
    usr_id: '',
    name: '',
    pwd: '',
    is_admin: false,
    dep: '',
    b_dat: '',
    e_dat: '',
    depro_no: '',
    rem: '',
    mng: '',
    tel1: '',
    e_mail: '',
  });
  userEditing.value = null;
}

function openUserAdd() {
  resetUserForm();
  userForm.pwd = '123456';
  userDialog.value = true;
}

function openUserEdit(row: SysAuthUser) {
  userEditing.value = row.usr_id;
  Object.assign(userForm, { ...row, pwd: '' });
  userDialog.value = true;
}

async function loadBase() {
  loading.value = true;
  try {
    const [u, c, w, d] = await Promise.all([
      api.sysAuthUsers(),
      api.sysAuthCatalog(),
      api.warehouses(),
      api.deptList(),
    ]);
    users.value = u.data;
    catalog.value = c.data;
    whOptions.value = w.data.map((x) => ({ wh: x.wh, name: x.name ?? '' }));
    deptOptions.value = d.data.map((x) => ({ dep: x.dep, name: x.name ?? '' }));
    if (!permUsrId.value && users.value.length) permUsrId.value = users.value[0].usr_id;
    if (!deproUsrId.value && users.value.length) deproUsrId.value = users.value[0].usr_id;
    if (!whUsrId.value && users.value.length) whUsrId.value = users.value[0].usr_id;
  } catch (e: unknown) {
    ElMessage.error(apiErrorMessage(e, '加载失败'));
  } finally {
    loading.value = false;
  }
}

async function saveUser() {
  if (!userForm.usr_id.trim()) {
    ElMessage.warning('请输入用户代号');
    return;
  }
  if (!userForm.name.trim()) {
    ElMessage.warning('请输入名称');
    return;
  }
  if (!userEditing.value && !userForm.pwd) {
    ElMessage.warning('请输入密码');
    return;
  }
  userSaving.value = true;
  try {
    if (userEditing.value) {
      await api.sysAuthUpdateUser(userEditing.value, userForm);
    } else {
      await api.sysAuthCreateUser(userForm);
    }
    userDialog.value = false;
    await loadBase();
    if (currentUser.value?.usr_id === userForm.usr_id) await refreshAuth();
    ElMessage.success('已保存');
  } catch (e: unknown) {
    ElMessage.error(apiErrorMessage(e, '保存失败'));
  } finally {
    userSaving.value = false;
  }
}

async function removeUser(row: SysAuthUser) {
  if (row.usr_id === currentUser.value?.usr_id) {
    ElMessage.warning('不能删除当前登录用户');
    return;
  }
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.usr_id}」？`, '确认', { type: 'warning' });
    await api.sysAuthDeleteUser(row.usr_id);
    await loadBase();
    ElMessage.success('已删除');
  } catch (e: unknown) {
    if (e !== 'cancel') ElMessage.error(apiErrorMessage(e, '删除失败'));
  }
}

async function loadMenus() {
  if (!permUsrId.value) return;
  try {
    const { data } = await api.sysAuthUserMenus(permUsrId.value);
    menuRows.value = data;
  } catch (e: unknown) {
    ElMessage.error(apiErrorMessage(e, '加载菜单权限失败'));
  }
}

async function saveMenus() {
  if (!permUsrId.value) return;
  menuSaving.value = true;
  try {
    await api.sysAuthSaveUserMenus(permUsrId.value, menuRows.value);
    if (currentUser.value?.usr_id === permUsrId.value) await refreshAuth();
    ElMessage.success('菜单权限已保存');
  } catch (e: unknown) {
    ElMessage.error(apiErrorMessage(e, '保存失败'));
  } finally {
    menuSaving.value = false;
  }
}

async function copyMenus() {
  if (!permUsrId.value || !copyFromUsr.value) {
    ElMessage.warning('请选择来源用户');
    return;
  }
  try {
    const { data } = await api.sysAuthCopyUserMenus(permUsrId.value, copyFromUsr.value);
    menuRows.value = data;
    ElMessage.success('已复制权限');
  } catch (e: unknown) {
    ElMessage.error(apiErrorMessage(e, '复制失败'));
  }
}

function menuRow(pgm: string) {
  let row = menuRows.value.find((r) => r.pgm === pgm);
  if (!row) {
    row = { pgm, dsp: false, apd: false, upd: false, del: false, prt: false };
    menuRows.value.push(row);
  }
  return row;
}

async function loadDepro() {
  const u = users.value.find((x) => x.usr_id === deproUsrId.value);
  deproNo.value = u?.depro_no || '';
  if (!deproNo.value.trim()) {
    deproLines.value = [];
    return;
  }
  try {
    const { data } = await api.sysAuthDepro(deproNo.value);
    deproLines.value = data.length ? data : [{ dep: '', rem: '' }];
  } catch (e: unknown) {
    ElMessage.error(apiErrorMessage(e, '加载部门群组失败'));
  }
}

async function saveDepro() {
  if (!deproNo.value.trim()) {
    ElMessage.warning('请填写部门群组代号');
    return;
  }
  deproSaving.value = true;
  try {
    await api.sysAuthSaveDepro(deproNo.value, deproLines.value.filter((l) => l.dep.trim()));
    if (deproUsrId.value) {
      await api.sysAuthUpdateUser(deproUsrId.value, { depro_no: deproNo.value });
    }
    await loadBase();
    ElMessage.success('部门数据权限已保存');
  } catch (e: unknown) {
    ElMessage.error(apiErrorMessage(e, '保存失败'));
  } finally {
    deproSaving.value = false;
  }
}

function addDeproLine() {
  deproLines.value.push({ dep: '', rem: '' });
}

async function loadWh() {
  if (!whUsrId.value) return;
  try {
    const { data } = await api.sysAuthUserWh(whUsrId.value);
    whSelected.value = data;
  } catch (e: unknown) {
    ElMessage.error(apiErrorMessage(e, '加载仓库权限失败'));
  }
}

async function saveWh() {
  if (!whUsrId.value) return;
  whSaving.value = true;
  try {
    await api.sysAuthSaveUserWh(whUsrId.value, whSelected.value);
    if (currentUser.value?.usr_id === whUsrId.value) await refreshAuth();
    ElMessage.success('仓库权限已保存（空=全部仓库）');
  } catch (e: unknown) {
    ElMessage.error(apiErrorMessage(e, '保存失败'));
  } finally {
    whSaving.value = false;
  }
}

watch(permUsrId, () => loadMenus());
watch(deproUsrId, () => loadDepro());
watch(whUsrId, () => loadWh());
watch(activeTab, (t) => {
  if (t === 'menus' && permUsrId.value) loadMenus();
  if (t === 'depro' && deproUsrId.value) loadDepro();
  if (t === 'wh' && whUsrId.value) loadWh();
});

onMounted(async () => {
  await loadBase();
  await loadMenus();
});
</script>

<template>
  <div class="perm-page">
    <header class="perm-page__head">
      <h1 class="perm-page__title">权限设置</h1>
      <p class="perm-page__sub">用户维护 · 菜单权限 · 部门/仓库数据权限（SUNLIKE SysAuth）</p>
    </header>

    <el-tabs v-model="activeTab" class="perm-tabs">
      <el-tab-pane label="用户列表" name="users">
        <ErpBasePage title="用户" :loading="loading" @add="openUserAdd">
          <template #query>
            <ErpQueryBar @search="() => {}" @reset="userQuery.usr_id = ''; userQuery.name = ''">
              <ErpQueryBarField label="用户代号">
                <el-input v-model="userQuery.usr_id" clearable />
              </ErpQueryBarField>
              <ErpQueryBarField label="名称">
                <el-input v-model="userQuery.name" clearable />
              </ErpQueryBarField>
            </ErpQueryBar>
          </template>
          <template #table>
            <el-table :data="filteredUsers" stripe border height="100%">
              <el-table-column prop="usr_id" label="用户代号" width="120" />
              <el-table-column prop="name" label="名称" min-width="120" />
              <el-table-column prop="dep" label="部门" width="90" />
              <el-table-column label="管理员" width="80" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.is_admin" type="danger" size="small">是</el-tag>
                  <span v-else>否</span>
                </template>
              </el-table-column>
              <el-table-column prop="e_dat" label="停用日期" width="110" />
              <el-table-column label="操作" width="140" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openUserEdit(row)">修改</el-button>
                  <el-button link type="danger" @click="removeUser(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </ErpBasePage>
      </el-tab-pane>

      <el-tab-pane label="菜单权限" name="menus">
        <div class="perm-panel">
          <div class="perm-panel__bar">
            <span>用户</span>
            <el-select v-model="permUsrId" filterable style="width: 160px">
              <el-option v-for="u in users" :key="u.usr_id" :label="`${u.usr_id} ${u.name}`" :value="u.usr_id" />
            </el-select>
            <span>从用户复制</span>
            <el-select v-model="copyFromUsr" filterable clearable placeholder="来源" style="width: 160px">
              <el-option v-for="u in users" :key="u.usr_id" :label="u.usr_id" :value="u.usr_id" />
            </el-select>
            <el-button @click="copyMenus">复制</el-button>
            <el-button type="primary" :loading="menuSaving" @click="saveMenus">保存</el-button>
          </div>
          <el-table :data="catalog" border stripe max-height="520">
            <el-table-column prop="group" label="分组" width="100" />
            <el-table-column prop="name" label="菜单" width="120" />
            <el-table-column prop="pgm" label="PGM" width="100" />
            <el-table-column label="查询" width="64" align="center">
              <template #default="{ row }">
                <el-checkbox v-model="menuRow(row.pgm).dsp" />
              </template>
            </el-table-column>
            <el-table-column label="新增" width="64" align="center">
              <template #default="{ row }">
                <el-checkbox v-model="menuRow(row.pgm).apd" />
              </template>
            </el-table-column>
            <el-table-column label="修改" width="64" align="center">
              <template #default="{ row }">
                <el-checkbox v-model="menuRow(row.pgm).upd" />
              </template>
            </el-table-column>
            <el-table-column label="删除" width="64" align="center">
              <template #default="{ row }">
                <el-checkbox v-model="menuRow(row.pgm).del" />
              </template>
            </el-table-column>
            <el-table-column label="打印" width="64" align="center">
              <template #default="{ row }">
                <el-checkbox v-model="menuRow(row.pgm).prt" />
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="部门数据权限" name="depro">
        <div class="perm-panel">
          <div class="perm-panel__bar">
            <span>用户</span>
            <el-select v-model="deproUsrId" filterable style="width: 160px">
              <el-option v-for="u in users" :key="u.usr_id" :label="`${u.usr_id} ${u.name}`" :value="u.usr_id" />
            </el-select>
            <span>部门群组代号</span>
            <el-input v-model="deproNo" style="width: 140px" />
            <el-button @click="addDeproLine">增行</el-button>
            <el-button type="primary" :loading="deproSaving" @click="saveDepro">保存</el-button>
          </div>
          <el-table :data="deproLines" border stripe max-height="400">
            <el-table-column type="index" width="50" />
            <el-table-column label="部门代号" min-width="160">
              <template #default="{ row }">
                <el-select v-model="row.dep" filterable clearable placeholder="部门" style="width: 100%">
                  <el-option
                    v-for="d in deptOptions"
                    :key="d.dep"
                    :label="`${d.dep} ${d.name || ''}`"
                    :value="d.dep"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="说明" min-width="160">
              <template #default="{ row }">
                <el-input v-model="row.rem" />
              </template>
            </el-table-column>
          </el-table>
          <p class="perm-hint">可见范围 = 用户所属部门 ∪ 本群组部门列表（DEV-06）。</p>
        </div>
      </el-tab-pane>

      <el-tab-pane label="仓库数据权限" name="wh">
        <div class="perm-panel">
          <div class="perm-panel__bar">
            <span>用户</span>
            <el-select v-model="whUsrId" filterable style="width: 160px">
              <el-option v-for="u in users" :key="u.usr_id" :label="`${u.usr_id} ${u.name}`" :value="u.usr_id" />
            </el-select>
            <el-button type="primary" :loading="whSaving" @click="saveWh">保存</el-button>
          </div>
          <el-select
            v-model="whSelected"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="不选表示全部仓库"
            style="width: 100%; max-width: 640px"
          >
            <el-option
              v-for="w in whOptions"
              :key="w.wh"
              :label="`${w.wh} ${w.name || ''}`"
              :value="w.wh"
            />
          </el-select>
          <p class="perm-hint">未配置任何仓库时，默认可访问全部仓库（DEV-06）。</p>
        </div>
      </el-tab-pane>
    </el-tabs>

    <ErpEditDialog
      v-model="userDialog"
      :title="userEditing ? '修改用户' : '新增用户'"
      :loading="userSaving"
      @save="saveUser"
    >
      <ErpFormSection title="用户资料">
        <el-form label-width="100px">
          <el-form-item label="用户代号" required>
            <el-input v-model="userForm.usr_id" :disabled="!!userEditing" maxlength="12" />
          </el-form-item>
          <el-form-item label="名称" required>
            <el-input v-model="userForm.name" maxlength="100" />
          </el-form-item>
          <el-form-item :label="userEditing ? '新密码' : '密码'" :required="!userEditing">
            <el-input v-model="userForm.pwd" type="password" show-password placeholder="留空则不修改" />
          </el-form-item>
          <el-form-item label="部门">
            <el-select v-model="userForm.dep" filterable clearable style="width: 100%">
              <el-option
                v-for="d in deptOptions"
                :key="d.dep"
                :label="`${d.dep} ${d.name || ''}`"
                :value="d.dep"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="管理员">
            <el-switch v-model="userForm.is_admin" />
          </el-form-item>
          <el-form-item label="启用日期">
            <el-date-picker v-model="userForm.b_dat" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
          <el-form-item label="停用日期">
            <el-date-picker v-model="userForm.e_dat" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
          <el-form-item label="部门群组">
            <el-input v-model="userForm.depro_no" maxlength="8" />
          </el-form-item>
          <el-form-item label="电话">
            <el-input v-model="userForm.tel1" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="userForm.e_mail" />
          </el-form-item>
          <el-form-item label="摘要">
            <el-input v-model="userForm.rem" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>
      </ErpFormSection>
    </ErpEditDialog>
  </div>
</template>

<style scoped>
.perm-page {
  padding: 12px 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.perm-page__head {
  margin-bottom: 8px;
}
.perm-page__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.perm-page__sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #86909c;
}
.perm-tabs {
  flex: 1;
  min-height: 0;
}
.perm-tabs :deep(.el-tabs__content) {
  height: calc(100% - 48px);
}
.perm-panel {
  padding: 8px 0;
}
.perm-panel__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.perm-hint {
  margin-top: 12px;
  font-size: 12px;
  color: #86909c;
}
</style>
