export type CollectionErrorCode = 'name' | 'capacity' | 'conflict' | 'storage';
export function collectionError(
  code: Exclude<CollectionErrorCode, 'storage'>,
  message: string,
): Error {
  return new Error(`NR_COLLECTION_${code.toUpperCase()}:${message}`);
}
export function collectionFailure(error: unknown): { code: CollectionErrorCode; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  const match = /^NR_COLLECTION_(NAME|CAPACITY|CONFLICT):(.*)$/s.exec(raw);
  return match
    ? { code: match[1].toLowerCase() as CollectionErrorCode, message: match[2] }
    : { code: 'storage', message: raw };
}
