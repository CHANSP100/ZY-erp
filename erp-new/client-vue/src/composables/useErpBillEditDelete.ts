import { computed, ref, type Ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

type BillRow = Record<string, unknown>;

export function useErpBillEditDelete(options: {
  billLabel: string;
  billNoKey: string;
  getBillNo: () => string | undefined;
  editing: Ref<string | null>;
  list: Ref<BillRow[]>;
  openBill: (no: string) => Promise<void>;
  resetNew: () => Promise<void>;
  reloadList: () => Promise<void>;
  deleteBill: (no: string) => Promise<void>;
}) {
  const deleting = ref(false);
  const editPicker = ref(false);

  const canDelete = computed(() => {
    const no = options.editing.value || options.getBillNo()?.trim();
    if (!no) return false;
    return options.list.value.some((r) => String(r[options.billNoKey] ?? '') === no);
  });

  async function onToolbarEdit() {
    const no = options.editing.value || options.getBillNo()?.trim();
    if (no && options.list.value.some((r) => String(r[options.billNoKey] ?? '') === no)) {
      await options.openBill(no);
      ElMessage.success(`已加载${options.billLabel} ${no}`);
      return;
    }
    if (!options.list.value.length) {
      ElMessage.warning(`暂无可编辑的${options.billLabel}`);
      return;
    }
    editPicker.value = true;
  }

  async function onPickEdit(row: BillRow) {
    const no = String(row[options.billNoKey] ?? '').trim();
    if (!no) return;
    await options.openBill(no);
    editPicker.value = false;
    ElMessage.success(`已进入编辑 ${no}`);
  }

  async function onToolbarDelete() {
    const no = options.editing.value || options.getBillNo()?.trim();
    if (!no) {
      ElMessage.warning(`请先打开或存盘${options.billLabel}`);
      return;
    }
    if (!options.list.value.some((r) => String(r[options.billNoKey] ?? '') === no)) {
      ElMessage.warning(`${options.billLabel} ${no} 尚未存盘，无法删除`);
      return;
    }
    try {
      await ElMessageBox.confirm(
        `确定删除${options.billLabel} ${no}？此操作不可恢复。`,
        '删除确认',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
      );
    } catch {
      return;
    }
    deleting.value = true;
    try {
      await options.deleteBill(no);
      ElMessage.success('删除成功');
      options.editing.value = null;
      await options.resetNew();
      await options.reloadList();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '删除失败');
    } finally {
      deleting.value = false;
    }
  }

  return {
    deleting,
    editPicker,
    canDelete,
    onToolbarEdit,
    onToolbarDelete,
    onPickEdit,
  };
}
