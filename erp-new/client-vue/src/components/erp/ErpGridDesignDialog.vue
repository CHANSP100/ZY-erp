<script setup lang="ts">

import { computed, reactive, ref, watch } from 'vue';

import { ElMessage } from 'element-plus';

import SunlikeSqlEditor from '@/components/erp/SunlikeSqlEditor.vue';

import { api } from '@/api';

import type { DetailGridColumn, ExtFieldSelectConfig } from '@/api/types';

import { translateSunlikeSqlExpr } from '@/utils/sunlikeSqlExpr';



const props = defineProps<{

  modelValue: boolean;

  menuCode: string;

  mode: 'list' | 'physical';

  gridArea?: 'head' | 'line';

  /** 传入则进入更改模式（字段代号不可改） */
  editColumn?: DetailGridColumn | null;

}>();



const emit = defineEmits<{

  'update:modelValue': [boolean];

  saved: [];

}>();



const DISPLAY_FORMATS = [

  { value: 'text', label: '文本' },

  { value: 'qty', label: '数量' },

  { value: 'price', label: '单价' },

  { value: 'amount', label: '金额' },

  { value: 'rate', label: '比率' },

  { value: 'date', label: '日期' },

  { value: 'datetime', label: '日期时间' },

];



const PHYS_TYPES = [

  { value: 'varchar', label: '字符' },

  { value: 'numeric', label: '数值' },

  { value: 'date', label: '日期' },

  { value: 'datetime', label: '日期时间' },

];



const FIELD_SOURCES = [
  { value: 'input', label: '录入框' },
  { value: 'select', label: '下拉框' },
  { value: 'sql', label: 'SQL 表达式' },
] as const;

const SELECT_MODES = [
  { value: 'static', label: '固定选项' },
  { value: 'table', label: '表/视图' },
] as const;



/** 与 el-select 同步，保存时以此为准（避免 reactive 绑定异常） */
const fieldSource = ref<'input' | 'select' | 'sql'>('input');

const form = reactive({

  col_key: '',

  label: '',

  required: false,

  phys_type: 'varchar',

  phys_len: 50 as number | undefined,

  display_format: 'text',

  sql_expr: '',

  width: undefined as number | undefined,

});



/** 下拉来源：固定选项 / 表或视图（第 1 列落 _Z） */

const selectMode = ref<'static' | 'table'>('static');

const staticOptions = ref<{ value: string; label: string }[]>([{ value: '', label: '' }]);

const tableName = ref('');



const saving = ref(false);



const isListMode = computed(() => props.mode === 'list');

const isEdit = computed(() => !!props.editColumn);

const isSelect = computed(() => !isListMode.value && fieldSource.value === 'select');

const isSqlField = computed(() => isListMode.value || fieldSource.value === 'sql');

const dialogKey = computed(() => `${props.menuCode}-${props.mode}-${props.gridArea ?? 'head'}`);

function resolveFieldSource(): 'sql' | 'input' | 'select' {
  if (isListMode.value) return 'sql';
  const s = fieldSource.value;
  if (s === 'sql' || s === 'select') return s;
  return 'input';
}

function onFieldSourceChange(v: string) {
  if (v === 'sql' || v === 'select' || v === 'input') {
    fieldSource.value = v;
  } else {
    fieldSource.value = 'input';
  }
  if (fieldSource.value !== 'sql') form.sql_expr = '';
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      if (props.editColumn) loadFormFromColumn(props.editColumn);
      else resetForm();
    }
  }
);




const title = computed(() => {
  if (isEdit.value) {
    const area = props.gridArea === 'line' ? '表身' : '表头';
    return `更改扩展字段 — ${props.menuCode}${area ? ` · ${area}` : ''}`;
  }
  const area =
    props.mode === 'physical' ? (props.gridArea === 'line' ? '表身' : '表头') : '';
  return `设计表单 — ${props.menuCode}${area ? ` · ${area}` : ''}`;
});



const selectSummary = computed(() => {

  if (!isSelect.value) return '';

  if (selectMode.value === 'table') {

    const t = tableName.value.trim();

    return t ? `表/视图 ${t} · 第 1 列落库` : '';

  }

  const opts = staticOptions.value.filter((o) => o.value.trim());

  return opts.length ? `固定选项 ${opts.length} 项` : '';

});



function addStaticOption() {

  staticOptions.value = [...staticOptions.value, { value: '', label: '' }];

}



function removeStaticOption(idx: number) {

  if (staticOptions.value.length <= 1) {

    staticOptions.value = [{ value: '', label: '' }];

    return;

  }

  staticOptions.value = staticOptions.value.filter((_, i) => i !== idx);

}



function buildSelectConfig(): ExtFieldSelectConfig | null {

  if (selectMode.value === 'table') {

    const name = tableName.value.trim();

    if (!name) return null;

    return { mode: 'table', table_name: name };

  }

  const options = staticOptions.value

    .map((o) => ({ value: o.value.trim(), label: (o.label.trim() || o.value.trim()) }))

    .filter((o) => o.value);

  if (!options.length) return null;

  return { mode: 'static', options };

}



function resetForm() {

  form.col_key = '';

  form.label = '';

  fieldSource.value = 'input';

  form.required = false;

  form.phys_type = 'varchar';

  form.phys_len = 50;

  form.display_format = 'text';

  form.sql_expr = '';

  form.width = undefined;

  selectMode.value = 'static';

  staticOptions.value = [{ value: '', label: '' }];

  tableName.value = '';

}

function loadSelectConfigFromColumn(cfg: ExtFieldSelectConfig | null) {
  if (!cfg) {
    selectMode.value = 'static';
    staticOptions.value = [{ value: '', label: '' }];
    tableName.value = '';
    return;
  }
  if (cfg.mode === 'table') {
    selectMode.value = 'table';
    tableName.value = cfg.table_name || '';
    staticOptions.value = [{ value: '', label: '' }];
    return;
  }
  selectMode.value = 'static';
  tableName.value = '';
  staticOptions.value = cfg.options?.length
    ? cfg.options.map((o) => ({ value: o.value, label: o.label }))
    : [{ value: '', label: '' }];
}

function loadFormFromColumn(col: DetailGridColumn) {
  form.col_key = col.col_key;
  form.label = col.label;
  const src = col.field_source || 'input';
  fieldSource.value = src === 'sql' || src === 'select' ? src : 'input';
  form.required = !!col.required;
  form.phys_type = col.phys_type || 'varchar';
  form.phys_len = col.phys_len ?? 50;
  form.display_format = col.display_format || 'text';
  form.sql_expr = col.sql_expr_src || col.sql_expr || '';
  form.width = col.width ?? undefined;
  loadSelectConfigFromColumn(col.select_config ?? null);
}



function onCancel() {
  resetForm();
  emit('update:modelValue', false);
}

async function onSave() {
  if (!form.col_key.trim() || !form.label.trim()) {
    ElMessage.warning('请填写字段代号、显示名称');
    return;
  }

  const source = resolveFieldSource();

  if (source === 'select') {

    const cfg = buildSelectConfig();

    if (!cfg) {

      ElMessage.warning(

        selectMode.value === 'table' ? '请填写表或视图名称' : '请至少添加一个固定选项'

      );

      return;

    }

  }



  let translated = '';

  if (source === 'sql') {

    if (!form.sql_expr.trim()) {

      ElMessage.warning('请填写 SQL 表达式');

      return;

    }

    try {

      translated = translateSunlikeSqlExpr(form.sql_expr.trim(), props.menuCode);

    } catch (e: unknown) {

      ElMessage.error(e instanceof Error ? e.message : 'SQL 翻译失败');

      return;

    }

  }



  const selectConfig = source === 'select' ? buildSelectConfig() : undefined;

  saving.value = true;

  try {
    const payload = {
      label: form.label.trim(),
      field_source: source,
      required: form.required,
      phys_len: isListMode.value ? undefined : form.phys_type === 'varchar' ? form.phys_len : form.phys_len,
      display_format: form.display_format,
      sql_expr: source === 'sql' ? translated : undefined,
      sql_expr_src: source === 'sql' ? form.sql_expr.trim() : undefined,
      select_config: selectConfig ?? undefined,
      width: form.width,
    };

    if (isEdit.value && props.editColumn) {
      await api.detailGridUpdateColumn(props.menuCode, props.editColumn.col_key, payload);
      ElMessage.success('字段已更改');
    } else {
      await api.detailGridAddColumn(props.menuCode, {
        col_key: form.col_key.trim(),
        mode: props.mode,
        grid_area: props.gridArea ?? 'head',
        phys_type: isListMode.value ? undefined : form.phys_type,
        ...payload,
      });
      ElMessage.success('字段已添加');
    }

    emit('saved');

    emit('update:modelValue', false);

    resetForm();

  } catch (e: unknown) {

    const err = e as { response?: { data?: { error?: string } } };

    ElMessage.error(err.response?.data?.error || (isEdit.value ? '更改失败' : '添加失败'));

  } finally {

    saving.value = false;

  }

}

</script>



<template>

  <el-dialog
    :key="dialogKey"
    :model-value="modelValue"
    :title="title"
    width="720px"
    class="kd-so-dialog"
    destroy-on-close
    @update:model-value="(v: boolean) => (v ? emit('update:modelValue', true) : onCancel())"
  >

    <el-form label-width="108px" @submit.prevent>

      <el-form-item label="字段代号" required>

        <el-input v-model="form.col_key" placeholder="小写英文，如 ext_cus" :disabled="isEdit" />

      </el-form-item>

      <el-form-item label="显示名称" required>

        <el-input v-model="form.label" placeholder="列标题" />

      </el-form-item>



      <template v-if="!isListMode">

        <el-form-item label="字段来源" required>
          <el-select
            :model-value="fieldSource"
            style="width: 200px"
            @update:model-value="onFieldSourceChange"
          >
            <el-option
              v-for="opt in FIELD_SOURCES"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="物理类型" required>

          <el-select v-model="form.phys_type" style="width: 160px" :disabled="isEdit">

            <el-option v-for="t in PHYS_TYPES" :key="t.value" :label="t.label" :value="t.value" />

          </el-select>

          <el-input-number

            v-if="form.phys_type === 'varchar'"

            v-model="form.phys_len"

            :min="1"

            :max="4000"

            controls-position="right"

            style="width: 120px; margin-left: 8px"

          />

        </el-form-item>



        <template v-if="isSelect">

          <el-form-item label="下拉来源" required>
            <el-select v-model="selectMode" style="width: 200px">
              <el-option
                v-for="opt in SELECT_MODES"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>



          <el-form-item v-if="selectMode === 'static'" label="选项列表" required>

            <div class="erp-grid-design__static-options">

              <div

                v-for="(opt, idx) in staticOptions"

                :key="idx"

                class="erp-grid-design__static-row"

              >

                <el-input v-model="opt.value" placeholder="存盘值" style="flex: 1" />

                <el-input v-model="opt.label" placeholder="显示文字" style="flex: 1" />

                <el-button text type="danger" @click="removeStaticOption(idx)">删</el-button>

              </div>

              <el-button size="small" @click="addStaticOption">添加选项</el-button>

            </div>

          </el-form-item>



          <el-form-item v-else label="表/视图名" required>

            <el-input v-model="tableName" placeholder="如 CUST、MY_WH" />

            <p class="erp-grid-design__hint">假定该表/视图仅两列：第 1 列写入 _Z，第 2 列供下拉显示</p>

          </el-form-item>



          <el-form-item v-if="selectSummary" label="配置摘要">

            <span class="erp-grid-design__summary">{{ selectSummary }}</span>

          </el-form-item>

        </template>

      </template>



      <el-form-item label="展示格式">

        <el-select v-model="form.display_format" style="width: 160px">

          <el-option v-for="f in DISPLAY_FORMATS" :key="f.value" :label="f.label" :value="f.value" />

        </el-select>

      </el-form-item>



      <el-form-item label="是否必填">

        <el-switch v-model="form.required" />

      </el-form-item>



      <el-form-item v-if="isSqlField" label="SQL 表达式" required>

        <SunlikeSqlEditor v-model="form.sql_expr" :menu-code="menuCode" :rows="5" />

      </el-form-item>



      <el-form-item label="列宽">

        <el-input-number v-model="form.width" :min="48" :max="400" controls-position="right" />

      </el-form-item>

    </el-form>

    <template #footer>

      <el-button @click="onCancel">取消</el-button>

      <el-button type="primary" :loading="saving" @click="onSave">{{ isEdit ? '保存更改' : '保存' }}</el-button>

    </template>

  </el-dialog>

</template>



<style scoped>

.erp-grid-design__static-options {

  width: 100%;

  display: flex;

  flex-direction: column;

  gap: 8px;

}

.erp-grid-design__static-row {

  display: flex;

  gap: 8px;

  align-items: center;

  width: 100%;

}

.erp-grid-design__hint {

  margin: 6px 0 0;

  font-size: 12px;

  color: var(--el-text-color-secondary);

}

.erp-grid-design__summary {

  font-size: 13px;

  color: var(--el-text-color-regular);

}

</style>

