import { useMemo } from 'react';
import { where, type QueryConstraint } from 'firebase/firestore';
import type { HistoryRangeFilter } from '../types';
import { getDaysAgo } from '../utils/dates';

export function useRangeConstraints(range: HistoryRangeFilter): {
  constraints: QueryConstraint[];
  depsKey: string;
} {
  return useMemo(() => {
    if (range === 'all') {
      return { constraints: [], depsKey: 'all' };
    }
    const since = getDaysAgo(range);
    return { constraints: [where('recordedAt', '>=', since)], depsKey: `${range}-${since.getTime()}` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);
}
