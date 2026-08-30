export type TimeRangeKey = 'h' | 'd' | 'w' | 'm' | 'y';

export type AggregateConfig = {
  rangeSeconds: number;
  bucketSeconds: number;
  cacheSeconds: number;
};

export type ResolvedRange =
  | {
      mode: 'preset';
      t: TimeRangeKey;
      sinceTs: number;
      untilTs: number;
      bucketSeconds: number;
      cacheSeconds: number;
    }
  | {
      mode: 'custom';
      sinceTs: number;
      untilTs: number;
      bucketSeconds: number;
      cacheSeconds: number;
    };

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const AGGREGATES: Record<TimeRangeKey, AggregateConfig> = {
  h: { rangeSeconds: HOUR, bucketSeconds: MINUTE, cacheSeconds: 60 },
  d: { rangeSeconds: DAY, bucketSeconds: 5 * MINUTE, cacheSeconds: 300 },
  w: { rangeSeconds: 7 * DAY, bucketSeconds: HOUR, cacheSeconds: 1800 },
  m: { rangeSeconds: 30 * DAY, bucketSeconds: 6 * HOUR, cacheSeconds: 3600 },
  y: { rangeSeconds: 365 * DAY, bucketSeconds: DAY, cacheSeconds: 21600 },
};

// Custom ranges can't exceed the widest preset range, to keep queries bounded.
const MAX_CUSTOM_RANGE_SECONDS = AGGREGATES.y.rangeSeconds;

const TIME_RANGE_KEYS: readonly TimeRangeKey[] = ['h', 'd', 'w', 'm', 'y'];

export function resolveTimeRangeKey(t: string | undefined): TimeRangeKey {
  return (TIME_RANGE_KEYS as readonly string[]).includes(t ?? '')
    ? (t as TimeRangeKey)
    : 'd';
}

export function getAggregateConfig(t: TimeRangeKey): AggregateConfig {
  return AGGREGATES[t];
}

/** Parses `from`/`to` query params into a validated custom range, or undefined if absent/invalid. */
export function parseCustomRange(
  from: string | undefined,
  to: string | undefined,
): { from: number; to: number } | undefined {
  if (from === undefined || to === undefined) return undefined;
  const fromTs = Number(from);
  const toTs = Number(to);
  if (!Number.isFinite(fromTs) || !Number.isFinite(toTs) || fromTs >= toTs) {
    return undefined;
  }
  return { from: Math.floor(fromTs), to: Math.floor(toTs) };
}

function bucketConfigForRange(rangeSeconds: number): {
  bucketSeconds: number;
  cacheSeconds: number;
} {
  const tier = (['h', 'd', 'w', 'm', 'y'] as const).find(
    (key) => rangeSeconds <= AGGREGATES[key].rangeSeconds,
  );
  const { bucketSeconds, cacheSeconds } = AGGREGATES[tier ?? 'y'];
  return { bucketSeconds, cacheSeconds };
}

export function resolveRange(
  query: { t?: string; from?: string; to?: string },
  now: number,
): ResolvedRange {
  const custom = parseCustomRange(query.from, query.to);
  if (custom) {
    const untilTs = Math.min(custom.to, now);
    const sinceTs = Math.max(custom.from, untilTs - MAX_CUSTOM_RANGE_SECONDS);
    return {
      mode: 'custom',
      sinceTs,
      untilTs,
      ...bucketConfigForRange(untilTs - sinceTs),
    };
  }

  const t = resolveTimeRangeKey(query.t);
  const { rangeSeconds, bucketSeconds, cacheSeconds } = getAggregateConfig(t);
  return {
    mode: 'preset',
    t,
    sinceTs: now - rangeSeconds,
    untilTs: now,
    bucketSeconds,
    cacheSeconds,
  };
}
