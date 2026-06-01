<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import ErpPrintTemplateDialog from '@/components/erp/ErpPrintTemplateDialog.vue';
import type { PrintTemplate } from '@/api/types';
import {
  PRINTER_OPTIONS,
  buildPrintTableHtml,
  openPrintPreview,
  type ExportColumn,
} from '@/utils/exportExcel';
import { inferDocNoFromRows, renderPrintHtmlAsync } from '@/utils/printRender';

const props = defineProps<{
  modelValue: boolean;
  menuCode: string;
  title: string;
  columns: ExportColumn[];
  rows: Record<string, string>[];
  defaultTemplate?: PrintTemplate | null;
  /** 二维码内容；不传则按首行单号（os_no/ps_no 等） */
  qrcodeText?: string;
  docNo?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
}>();

const tplDialogOpen = ref(false);
const selectedTpl = ref<PrintTemplate | null>(null);
const printer = ref('default');
const copies = ref(1);
const printing = ref(false);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      selectedTpl.value = props.defaultTemplate ?? null;
      printer.value = 'default';
      copies.value = 1;
    }
  }
);

function onTplSelect(tpl: PrintTemplate) {
  selectedTpl.value = tpl;
}

async function onPrint() {
  if (!selectedTpl.value) {
    ElMessage.warning('请选择打印模板');
    return;
  }
  printing.value = true;
  try {
    const table = buildPrintTableHtml(props.columns, props.rows);
    const now = new Date();
    const printTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const docNo =
      String(props.docNo ?? '').trim() ||
      String(props.qrcodeText ?? '').trim() ||
      inferDocNoFromRows(props.rows);

    const body = await renderPrintHtmlAsync(
      selectedTpl.value.content,
      {
        title: props.title,
        print_time: printTime,
        row_count: String(props.rows.length),
        table,
        qrcode_text: props.qrcodeText,
        doc_no: docNo,
      },
      { rows: props.rows }
    );

    const ok = openPrintPreview(body, props.title);
    if (!ok) {
      ElMessage.error('无法打开打印窗口，请检查浏览器拦截');
      return;
    }

    if (printer.value !== 'default') {
      ElMessage.info(
        `请在系统打印对话框中选择：${PRINTER_OPTIONS.find((p) => p.value === printer.value)?.label ?? printer.value}`
      );
    }
    if (copies.value > 1) {
      ElMessage.info(`份数 ${copies.value}：请在打印对话框中设置份数`);
    }
    emit('update:modelValue', false);
  } catch (e) {
    console.error(e);
    ElMessage.error('生成打印内容失败');
  } finally {
    printing.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="打印"
    width="480px"
    class="kd-so-dialog erp-print-dialog"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-width="88px" @submit.prevent>
      <el-form-item label="打印模板" required>
        <div class="erp-print-dialog__tpl">
          <el-input
            readonly
            :model-value="selectedTpl ? `${selectedTpl.tpl_no} ${selectedTpl.name}` : ''"
            placeholder="点击右侧选择模板"
            @click="tplDialogOpen = true"
          />
          <el-button @click="tplDialogOpen = true">…</el-button>
        </div>
      </el-form-item>
      <el-form-item label="打印机">
        <el-select v-model="printer" style="width: 100%">
          <el-option
            v-for="p in PRINTER_OPTIONS"
            :key="p.value"
            :label="p.label"
            :value="p.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="份数">
        <el-input-number v-model="copies" :min="1" :max="99" controls-position="right" />
      </el-form-item>
      <el-form-item label="数据行数">
        <span>{{ rows.length }} 行</span>
      </el-form-item>
      <el-form-item label="二维码">
        <span v-pre class="erp-print-dialog__qr-hint">
          模板含 {{qrcode}} 时，默认编码首行单号（os_no / ps_no 等）
        </span>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="printing" @click="onPrint">打印</el-button>
    </template>

    <ErpPrintTemplateDialog
      v-model="tplDialogOpen"
      :menu-code="menuCode"
      @select="onTplSelect"
    />
  </el-dialog>
</template>

<style scoped>
.erp-print-dialog__tpl {
  display: flex;
  gap: 8px;
  width: 100%;
}
.erp-print-dialog__tpl .el-input {
  flex: 1;
}
.erp-print-dialog__qr-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.erp-print-dialog__qr-hint code {
  font-size: 11px;
}
</style>
