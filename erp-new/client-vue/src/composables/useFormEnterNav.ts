import { nextTick, onMounted, onUnmounted, type Ref } from 'vue';

export type EnterNavJumpOptions = {
  disabled?: Ref<boolean> | boolean;
  /** 表身：当前行最后一栏 Enter → 增行 */
  onRowLast?: () => void | Promise<void>;
  focusAfterRowLast?: (focusables: HTMLElement[], root: HTMLElement) => HTMLElement | null;
  /** 表头：容器末栏 Enter（如跳入表身） */
  onLastField?: () => void | Promise<void>;
  focusAfterLast?: (focusables: HTMLElement[]) => HTMLElement | null | undefined;
};

export const ENTER_NAV_KEY = Symbol('erpEnterNav') as symbol;

const FOCUSABLE_SELECTOR = [
  '.lookup-field input:not([disabled])',
  'input:not([type="hidden"]):not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
].join(', ');

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

function isDateEnterTarget(el: HTMLElement): boolean {
  return !!el.closest('.el-date-editor, .el-date-picker');
}

export function isNavFocusable(el: HTMLElement, root: HTMLElement): boolean {
  if (!root.contains(el)) return false;
  if (el.closest('[data-enter-nav-skip]')) return false;
  if (el.closest('.is-disabled, [disabled], [aria-disabled="true"]')) return false;
  if (!isVisible(el)) return false;
  const input = el as HTMLInputElement;
  if (input.readOnly && !el.closest('.lookup-field')) return false;
  if (el.getAttribute('tabindex') === '-1') return false;
  return true;
}

export function collectEnterNavFocusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter((el) => isNavFocusable(el, root));
}

function getTableRow(el: HTMLElement): HTMLTableRowElement | null {
  return el.closest('tr');
}

function focusInput(el: HTMLElement) {
  el.focus();
  if (el.tagName === 'INPUT') (el as HTMLInputElement).select();
}

function isDisabledOption(options?: EnterNavJumpOptions): boolean {
  const d = options?.disabled;
  if (d == null) return false;
  return typeof d === 'boolean' ? d : d.value;
}

function isLastFocusableInRow(current: HTMLElement, root: HTMLElement): boolean {
  const row = getTableRow(current);
  if (!row) return false;
  const inRow = collectEnterNavFocusables(root).filter((el) => row.contains(el));
  return inRow.length > 0 && inRow[inRow.length - 1] === current;
}

/** 开窗/普通栏位 Enter 成功后跳下一栏（供 LookupField 调用） */
export async function focusNextInEnterNavZone(
  current: HTMLElement,
  jumpOptions?: EnterNavJumpOptions | null
): Promise<boolean> {
  const zone = current.closest('.erp-enter-nav-zone') as HTMLElement | null;
  if (!zone || isDisabledOption(jumpOptions ?? undefined)) return false;

  const list = collectEnterNavFocusables(zone);
  const idx = list.indexOf(current);
  if (idx < 0) return false;

  const next = list[idx + 1];
  const currentRow = getTableRow(current);
  const nextRow = next ? getTableRow(next) : null;

  if (next && (!currentRow || nextRow === currentRow)) {
    focusInput(next);
    return true;
  }

  if (currentRow && jumpOptions?.onRowLast && isLastFocusableInRow(current, zone)) {
    await jumpOptions.onRowLast();
    await nextTick();
    const after = collectEnterNavFocusables(zone);
    const pick = jumpOptions.focusAfterRowLast?.(after, zone);
    const tbodyRows = zone.querySelectorAll('tbody tr');
    const lastTr = tbodyRows[tbodyRows.length - 1];
    const inLastRow = lastTr ? after.filter((el) => lastTr.contains(el)) : [];
    const target = pick ?? inLastRow[0] ?? after[idx + 1];
    if (target) focusInput(target);
    return !!target;
  }

  if (idx >= 0 && idx < list.length - 1) {
    focusInput(list[idx + 1]!);
    return true;
  }

  if (jumpOptions?.onLastField) {
    await jumpOptions.onLastField();
    await nextTick();
    const after = collectEnterNavFocusables(zone);
    const pick = jumpOptions.focusAfterLast?.(after);
    const target = pick ?? after[idx + 1] ?? after[after.length - 1];
    if (target) focusInput(target);
    return !!target;
  }

  return false;
}

function isPopperOpen(classPart: string): boolean {
  const poppers = document.querySelectorAll(`.el-popper${classPart}`);
  for (const p of poppers) {
    if (p.getAttribute('aria-hidden') !== 'true') return true;
  }
  return false;
}

function shouldDeferEnter(target: HTMLElement): boolean {
  if (target.closest('.lookup-field')) return true;
  if (target.closest('.el-autocomplete') && isPopperOpen('.el-autocomplete__popper')) return true;
  if (target.closest('.el-select') && isPopperOpen('.el-select__popper')) return true;
  if (target.closest('.el-date-editor') && document.querySelector('.el-picker__popper[aria-hidden="false"]')) {
    return true;
  }
  return false;
}

export type FormEnterNavOptions = EnterNavJumpOptions;

/** 表单 Enter 跳下一栏；开窗栏由 LookupField 自行处理 Enter。 */
export function useFormEnterNav(
  containerRef: Ref<HTMLElement | null | undefined>,
  options?: FormEnterNavOptions
) {
  async function onKeydown(e: KeyboardEvent) {
    if (isDisabledOption(options)) return;
    if (e.key !== 'Enter') return;
    if (e.isComposing) return;

    const target = e.target as HTMLElement | null;
    if (!target || !(target instanceof HTMLElement)) return;

    const root = containerRef.value;
    if (!root?.contains(target)) return;

    if (target.closest('.lookup-field')) return;

    if (target.tagName === 'TEXTAREA') {
      if (!e.ctrlKey) return;
      e.preventDefault();
      await focusNextInEnterNavZone(target, options);
      return;
    }

    if (target.tagName === 'BUTTON') return;

    if (isDateEnterTarget(target)) return;

    if (shouldDeferEnter(target)) return;

    e.preventDefault();
    await focusNextInEnterNavZone(target, options);
  }

  onMounted(() => {
    containerRef.value?.addEventListener('keydown', onKeydown, true);
  });

  onUnmounted(() => {
    containerRef.value?.removeEventListener('keydown', onKeydown, true);
  });

  return {
    focusNext: (el: HTMLElement) => focusNextInEnterNavZone(el, options),
    collectEnterNavFocusables: () => collectEnterNavFocusables(containerRef.value),
  };
}
