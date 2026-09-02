/**
 * Format Student ID to start as SA00001
 * Example: 1 -> SA00001, 25 -> SA00025, 120 -> SA00120
 */
export function formatStudentId(id: number | string | undefined | null): string {
  if (id === undefined || id === null || id === '') return 'SA00001';
  if (typeof id === 'string' && id.startsWith('SA')) return id;
  const num = typeof id === 'number' ? id : parseInt(String(id).replace(/\D/g, ''), 10) || 1;
  return `SA${String(num).padStart(5, '0')}`;
}

/**
 * Format Employee / Teacher ID to start as EMP00001
 * Example: 1 -> EMP00001, 15 -> EMP00015, 105 -> EMP00105
 */
export function formatEmployeeId(id: number | string | undefined | null): string {
  if (id === undefined || id === null || id === '') return 'EMP00001';
  if (typeof id === 'string' && id.startsWith('EMP')) return id;
  const num = typeof id === 'number' ? id : parseInt(String(id).replace(/\D/g, ''), 10) || 1;
  return `EMP${String(num).padStart(5, '0')}`;
}
