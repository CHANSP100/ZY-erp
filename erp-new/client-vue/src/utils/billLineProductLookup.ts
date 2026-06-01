import { api } from '@/api';

/** 表身品号粘贴 / 开窗：按编码从服务端补查 */
export async function resolveLineProductByCode(
  code: string
): Promise<Record<string, unknown> | null | undefined> {
  const q = code.trim();
  if (!q) return null;
  try {
    const { data } = await api.getProduct(q);
    return data as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}
