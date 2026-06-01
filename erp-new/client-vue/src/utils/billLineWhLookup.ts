import { api } from '@/api';

/** 表身仓库开窗：按 WH 从 MY_WH 补查 */
export async function resolveWhByCode(
  code: string
): Promise<Record<string, unknown> | null | undefined> {
  const q = code.trim();
  if (!q) return null;
  try {
    const { data } = await api.getWh(q);
    return data as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}
