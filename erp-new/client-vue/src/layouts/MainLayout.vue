<script setup lang="ts">

import { computed, onMounted, ref } from 'vue';

import { useRoute, useRouter } from 'vue-router';

import { MENU_GROUP_LABEL, MENU_ROUTES } from '@/config/menuRegistry';

import { MENU_TAB_TITLES, useErpTabs } from '@/composables/useErpTabs';

import { useAuth } from '@/composables/useAuth';

import { usePermissions } from '@/composables/usePermissions';

import { initErpUser } from '@/composables/useErpUser';

import { fetchCurrentUser } from '@/composables/useAuth';



const route = useRoute();

const router = useRouter();

const collapsed = ref(false);

const { tabs, openTab, switchTab, closeTab } = useErpTabs();

const { user, logout } = useAuth();

const { canDsp } = usePermissions();

const menuGroups = computed(() => {

  const groups: { key: string; title: string; items: typeof MENU_ROUTES }[] = [];

  const map = new Map<string, typeof MENU_ROUTES>();

  for (const m of MENU_ROUTES) {

    if (!canDsp(m.pgm)) continue;

    const g = m.group;

    if (!map.has(g)) map.set(g, []);

    map.get(g)!.push(m);

  }

  for (const [key, items] of map) {

    if (items.length) {
      const title = MENU_GROUP_LABEL[key as keyof typeof MENU_GROUP_LABEL] ?? key;
      groups.push({ key, title, items });
    }

  }

  return groups;

});



onMounted(async () => {
  await fetchCurrentUser();
  await initErpUser();
});



const activeMenu = computed(() => route.path);



function onMenuSelect(path: string) {

  openTab(path, MENU_TAB_TITLES[path]);

}



async function onLogout() {

  await logout();

  await router.replace('/login');

}

</script>



<template>

  <el-container class="layout-root">

    <el-header height="40px" class="erp-header">

      <div

        class="erp-header__aside"

        :style="{ width: collapsed ? '64px' : '220px' }"

      >

        <div class="erp-header-title">新 ERP</div>

      </div>

      <div class="erp-header__main">

        <div class="erp-header-tabs">

          <button

            v-for="tab in tabs"

            :key="tab.path"

            type="button"

            class="erp-header-tab"

            :class="{ 'is-active': activeMenu === tab.path }"

            @click="switchTab(tab.path)"

          >

            <span class="erp-header-tab__label">{{ tab.title }}</span>

            <span

              class="erp-header-tab__close"

              title="关闭"

              @click.stop="closeTab(tab.path)"

            >×</span>

          </button>

        </div>

        <div class="header-tags">
          <span v-if="user" class="header-user">{{ user.name }}（{{ user.usr_id }}）</span>

          <el-button link type="primary" class="header-logout" @click="onLogout">退出</el-button>

        </div>

      </div>

    </el-header>

    <el-container>

      <el-aside :width="collapsed ? '64px' : '220px'" class="erp-aside">

        <div class="aside-toolbar">

          <el-button link @click="collapsed = !collapsed">

            {{ collapsed ? '展开' : '收起' }}

          </el-button>

        </div>

        <el-menu :default-active="activeMenu" :collapse="collapsed" @select="onMenuSelect">

          <el-sub-menu

            v-for="g in menuGroups"

            :key="g.key"

            :index="g.key"

          >

            <template #title>{{ g.title }}</template>

            <template v-for="item in g.items" :key="item.path">

              <el-sub-menu v-if="item.children?.length" :index="item.path">

                <template #title>{{ item.title }}</template>

                <el-menu-item

                  v-for="child in item.children"

                  :key="child.path"

                  :index="child.path"

                >

                  {{ child.title }}

                </el-menu-item>

              </el-sub-menu>

              <el-menu-item v-else :index="item.path">

                {{ item.title }}

              </el-menu-item>

            </template>

          </el-sub-menu>

        </el-menu>

      </el-aside>

      <el-main class="erp-main">

        <router-view v-slot="{ Component, route: r }">

          <keep-alive>

            <component :is="Component" :key="r.path" />

          </keep-alive>

        </router-view>

      </el-main>

    </el-container>

    <el-footer height="32px" class="erp-footer">

      © 2026 企业名称 · ERP

    </el-footer>

  </el-container>

</template>



<style scoped>

.layout-root {

  height: 100vh;

}

.header-tags {

  display: flex;

  flex-shrink: 0;

  align-items: center;

  gap: 8px;

}

.header-user {

  font-size: 13px;

  color: #4e5969;

  margin-left: 8px;

}

.header-logout {

  margin-left: 4px;

}

.aside-toolbar {

  padding: 8px;

  text-align: right;

  border-bottom: 1px solid #e5e7eb;

}

</style>

