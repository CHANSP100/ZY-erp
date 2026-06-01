<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { api } from '@/api';
import type { DbConnectionConfig } from '@/api/types';
import { login } from '@/composables/useAuth';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const remember = ref(true);

const form = reactive({
  usr_id: 'admin',
});

const REMEMBER_KEY = 'erp-login-usr';

const dbDialogVisible = ref(false);
const dbLoading = ref(false);
const dbTesting = ref(false);
const dbSaving = ref(false);
const dbTestPassed = ref(false);
const dbTestedSnapshot = ref('');

const dbForm = reactive<DbConnectionConfig>({
  server: '127.0.0.1',
  port: '',
  loginType: 'sql',
  businessDatabase: 'DB_11',
  systemDatabase: 'SUNSYSTEM',
  user: 'SA',
  password: '',
});

const isWindowsLogin = computed(() => dbForm.loginType === 'windows');

const dbSnapshot = computed(() =>
  JSON.stringify({
    server: dbForm.server.trim(),
    port: String(dbForm.port || '').trim(),
    loginType: dbForm.loginType || 'sql',
    businessDatabase: dbForm.businessDatabase.trim(),
    systemDatabase: dbForm.systemDatabase.trim(),
    user: dbForm.user.trim(),
    password: dbForm.password,
  })
);

watch(dbSnapshot, () => {
  if (dbTestedSnapshot.value && dbSnapshot.value !== dbTestedSnapshot.value) {
    dbTestPassed.value = false;
  }
});

onMounted(() => {
  const saved = localStorage.getItem(REMEMBER_KEY);
  if (saved) form.usr_id = saved;
});

async function onSubmit() {
  if (!form.usr_id.trim()) {
    ElMessage.warning('请输入账号');
    return;
  }
  loading.value = true;
  try {
    await login(form.usr_id.trim());
    if (remember.value) {
      localStorage.setItem(REMEMBER_KEY, form.usr_id.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/indx';
    await router.replace(redirect || '/indx');
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    ElMessage.error(err.response?.data?.error || '登录失败');
  } finally {
    loading.value = false;
  }
}

async function openDbSettings() {
  dbDialogVisible.value = true;
  dbTestPassed.value = false;
  dbTestedSnapshot.value = '';
  dbLoading.value = true;
  try {
    const { data } = await api.dbConfigGet();
    dbForm.server = data.server || '127.0.0.1';
    dbForm.port = data.port || '';
    dbForm.loginType = data.loginType === 'windows' ? 'windows' : 'sql';
    dbForm.businessDatabase = data.businessDatabase || 'DB_11';
    dbForm.systemDatabase = data.systemDatabase || 'SUNSYSTEM';
    dbForm.user = data.user || 'SA';
    dbForm.password = data.password || '';
  } catch {
    ElMessage.error('读取数据库配置失败');
  } finally {
    dbLoading.value = false;
  }
}

function validateDbForm() {
  if (!dbForm.server.trim()) {
    ElMessage.warning('请填写服务器地址');
    return false;
  }
  if (!dbForm.businessDatabase.trim()) {
    ElMessage.warning('请填写业务数据库名');
    return false;
  }
  if (!dbForm.systemDatabase.trim()) {
    ElMessage.warning('请填写系统配置数据库名');
    return false;
  }
  if (dbForm.loginType !== 'windows') {
    if (!dbForm.user.trim()) {
      ElMessage.warning('请填写 SQL 登录账号');
      return false;
    }
    if (!dbForm.password) {
      ElMessage.warning('请填写 SQL 登录密码');
      return false;
    }
  }
  return true;
}

async function onTestDbConnection() {
  if (!validateDbForm()) return;
  dbTesting.value = true;
  try {
    const { data } = await api.dbConfigTest({ ...dbForm });
    dbTestPassed.value = true;
    dbTestedSnapshot.value = dbSnapshot.value;
    ElMessage.success(`业务库连接成功：${data.database}`);
  } catch (e: unknown) {
    dbTestPassed.value = false;
    dbTestedSnapshot.value = '';
    const err = e as { response?: { data?: { error?: string } } };
    ElMessage.error(err.response?.data?.error || '连接失败');
  } finally {
    dbTesting.value = false;
  }
}

async function onSaveDbConfig() {
  if (!dbTestPassed.value || dbSnapshot.value !== dbTestedSnapshot.value) {
    ElMessage.warning('请先测试业务数据库连接');
    return;
  }
  if (!validateDbForm()) return;
  dbSaving.value = true;
  try {
    await api.dbConfigSave({ ...dbForm });
    ElMessage.success('数据库连接已保存，后续将使用 MSSQL 业务库');
    dbDialogVisible.value = false;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    ElMessage.error(err.response?.data?.error || '保存失败');
  } finally {
    dbSaving.value = false;
  }
}
</script>

<template>
  <div class="erp-login-page">
    <div class="erp-login-page__bg" />
    <div class="erp-login-card">
      <div class="erp-login-card__brand">
        <div class="erp-login-card__logo">ERP</div>
        <h1 class="erp-login-card__title">新 ERP 管理系统</h1>
        <p class="erp-login-card__sub">SUNLIKE 9.0 业务 · 金蝶云星空视觉</p>
      </div>

      <el-form class="erp-login-form" label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="账号">
          <el-input
            v-model="form.usr_id"
            placeholder="请输入账号"
            autocomplete="username"
            size="large"
            clearable
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <div class="erp-login-form__opts">
          <el-checkbox v-model="remember">记住账号</el-checkbox>
        </div>
        <el-button
          type="primary"
          class="erp-login-form__submit"
          size="large"
          :loading="loading"
          @click="onSubmit"
        >
          登 录
        </el-button>
      </el-form>

      <div class="erp-login-card__footer">
        <p class="erp-login-card__hint">输入 SUNLIKE 账号登录（如 ADMIN）；演示账号 admin / user01</p>
        <button
          type="button"
          class="erp-login-card__settings"
          title="数据库连接设置"
          aria-label="数据库连接设置"
          @click="openDbSettings"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"
            />
          </svg>
        </button>
      </div>
    </div>

    <el-dialog
      v-model="dbDialogVisible"
      title="数据库连接设置"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form v-loading="dbLoading" label-position="top" class="erp-db-config-form">
        <el-form-item label="登录方式" required>
          <el-radio-group v-model="dbForm.loginType">
            <el-radio label="sql">SQL Server 身份验证</el-radio>
            <el-radio label="windows">Windows 身份验证</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="服务器地址" required>
          <el-input
            v-model="dbForm.server"
            placeholder="IP、127.0.0.1 或 .\SQLEXPRESS"
            clearable
          />
        </el-form-item>
        <el-form-item label="端口（可选）">
          <el-input v-model="dbForm.port" placeholder="默认 1433，命名实例可留空" clearable />
        </el-form-item>
        <el-form-item label="业务数据库名" required>
          <el-input v-model="dbForm.businessDatabase" placeholder="SUNLIKE 业务账套库" clearable />
        </el-form-item>
        <el-form-item label="系统配置数据库名" required>
          <el-input v-model="dbForm.systemDatabase" placeholder="默认 SUNSYSTEM" clearable />
        </el-form-item>
        <template v-if="!isWindowsLogin">
          <el-form-item label="SQL 登录账号" required>
            <el-input v-model="dbForm.user" placeholder="例如 SA" clearable />
          </el-form-item>
          <el-form-item label="SQL 登录密码" required>
            <el-input
              v-model="dbForm.password"
              type="password"
              placeholder="请输入密码"
              show-password
              autocomplete="new-password"
            />
          </el-form-item>
        </template>
        <p class="erp-db-config-form__tip">
          <template v-if="isWindowsLogin">
            Windows 身份验证使用当前 Windows 用户连接，无需填写 SA 账号。
          </template>
          <template v-else>
            请使用 SA 或具有业务库权限的 SQL 账号；需在 SQL Server 中启用混合身份验证。
          </template>
          系统配置库默认 <strong>SUNSYSTEM</strong>。测试通过后再保存。
        </p>
      </el-form>
      <template #footer>
        <el-button @click="dbDialogVisible = false">取消</el-button>
        <el-button type="primary" plain :loading="dbTesting" @click="onTestDbConnection">
          测试连接
        </el-button>
        <el-button
          type="primary"
          :loading="dbSaving"
          :disabled="!dbTestPassed || dbSnapshot !== dbTestedSnapshot"
          @click="onSaveDbConfig"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
