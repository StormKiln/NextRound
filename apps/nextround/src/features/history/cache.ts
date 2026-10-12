import type { QueryClient } from '@tanstack/react-query';
import { type HistoryMutation, historyKey, mutateHistory, readHistory } from './repository';

// Explicit reads and writes share a queue. Ordinary queries may still start while
// an operation is pending, so cancel them again before publishing its result.
const queues = new WeakMap<QueryClient, Promise<unknown>>();
function ordered<T>(client: QueryClient, operation: () => Promise<T>): Promise<T> {
  const next = (queues.get(client) ?? Promise.resolve()).then(operation);
  queues.set(
    client,
    next.catch(() => undefined),
  );
  return next;
}
export function readHistoryIntoCache(client: QueryClient, active: () => boolean) {
  return ordered(client, async () => {
    if (active()) await client.cancelQueries({ queryKey: historyKey });
    try {
      const document = await readHistory();
      if (active()) {
        await client.cancelQueries({ queryKey: historyKey });
        if (active()) client.setQueryData(historyKey, document);
      }
      return document;
    } catch (error) {
      if (active()) {
        await client.cancelQueries({ queryKey: historyKey });
        if (active())
          client
            .getQueryCache()
            .find({ queryKey: historyKey })
            ?.setState({
              status: 'error',
              error: error instanceof Error ? error : new Error(String(error)),
              errorUpdatedAt: Date.now(),
            });
      }
      throw error;
    }
  });
}
export function mutateHistoryIntoCache(client: QueryClient, mutation: HistoryMutation) {
  return ordered(client, async () => {
    await client.cancelQueries({ queryKey: historyKey });
    const document = await mutateHistory(mutation);
    await client.cancelQueries({ queryKey: historyKey });
    client.setQueryData(historyKey, document);
    return document;
  });
}
