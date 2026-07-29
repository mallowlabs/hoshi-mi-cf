export type TimeRangeKey = 'h' | 'd' | 'w' | 'm' | 'y';

export type AggregateConfig = {
  rangeSeconds: number;
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

const TIME_RANGE_KEYS: readonly TimeRangeKey[] = ['h', 'd', 'w', 'm', 'y'];

export function resolveTimeRangeKey(t: string | undefined): TimeRangeKey {
  return (TIME_RANGE_KEYS as readonly string[]).includes(t ?? '')
    ? (t as TimeRangeKey)
    : 'd';
}

export function getAggregateConfig(t: TimeRangeKey): AggregateConfig {
  return AGGREGATES[t];
}
