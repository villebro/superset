/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { useMemo } from 'react';
import { useCurrentTime } from 'src/dashboard/hooks/useCurrentTime';
import { formatDuration } from 'src/features/tasks/timeUtils';

export interface LiveDurationProps {
  durationSeconds: number | null;
  /**
   * When true (realtime push active AND the task is still running), the value
   * ticks upward while it runs. When false, the server value renders
   * statically and refreshes on the next poll/fetch.
   */
  live: boolean;
  locale?: string;
}

// Animate only as fast as the smallest unit currently shown changes, so load
// scales with relevance. formatDuration renders sub-minute durations with a
// tenths decimal (→ 100ms), "Xm Ys" from 1 min (seconds → 1s), "Xh Ym" from
// 1 hour (minutes → 1min), and "Xd Yh" from 1 day (hours → 1h). Purely
// client-side re-renders, no network.
const MINUTE_S = 60;
const HOUR_S = 60 * MINUTE_S;
const DAY_S = 24 * HOUR_S;

const tickIntervalForSeconds = (seconds: number): number => {
  if (seconds < MINUTE_S) return 100;
  if (seconds < HOUR_S) return 1000;
  if (seconds < DAY_S) return 60 * 1000;
  return 60 * 60 * 1000;
};

/**
 * Renders a task's duration.
 *
 * The live value is anchored on the server-supplied `durationSeconds` plus
 * locally-measured elapsed time (`now - anchoredAt`), so it never parses an
 * absolute server timestamp and is therefore timezone-invariant. The anchor
 * re-bases whenever `durationSeconds` changes (e.g. a realtime nudge patches
 * the row), so ticking resumes from the fresh server value.
 */
export const LiveDuration = ({
  durationSeconds,
  live,
  locale,
}: LiveDurationProps) => {
  const anchor = useMemo(
    () =>
      durationSeconds == null
        ? null
        : { base: durationSeconds, at: Date.now() },
    [durationSeconds],
  );

  // Pick the tick cadence from the currently-elapsed value (read at render so
  // it stays fresh as the duration crosses a unit boundary); useCurrentTime
  // restarts its interval whenever this changes.
  const approxSeconds =
    anchor == null
      ? 0
      : anchor.base + Math.max(0, Date.now() - anchor.at) / 1000;
  const now = useCurrentTime(
    live,
    undefined,
    tickIntervalForSeconds(approxSeconds),
  );

  if (!live || anchor == null) {
    return <>{formatDuration(durationSeconds, locale) ?? '-'}</>;
  }

  const elapsed = anchor.base + Math.max(0, now - anchor.at) / 1000;
  return <>{formatDuration(elapsed, locale) ?? '-'}</>;
};

export default LiveDuration;
