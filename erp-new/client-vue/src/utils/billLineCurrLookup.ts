import { api } from '@/api';

/** 表头/表身币别开窗：按代号从 CUR_ID 表补查 */
export async function resolveCurrByCode(
  code: string
): Promise<Record<string, unknown> | null | undefined> {
  const q = code.trim();
  if (!q) return null;
  try {
    const { data } = await api.getCurr(q);
    return data as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}
