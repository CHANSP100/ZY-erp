/** 表身粘贴时自动增行 — 供 ErpBillLineTable @add-lines 使用 */
export function useBillLineAddRows(addLine: () => void) {
  function onAddLines(count: number) {
    const n = Math.max(0, Math.floor(count));
    for (let i = 0; i < n; i++) addLine();
  }
  return { onAddLines };
}
