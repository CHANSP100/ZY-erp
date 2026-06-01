import { useExtFieldColumns } from './useExtFieldColumns';

/** @deprecated 使用 useExtFieldColumns(menuCode, 'head') */
export function useArchiveExtFields(menuCode: string) {
  return useExtFieldColumns(menuCode, 'head');
}
