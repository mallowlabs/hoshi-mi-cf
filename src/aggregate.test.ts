import { getAggregateConfig, resolveTimeRangeKey } from './aggregate';

describe('resolveTimeRangeKey', () => {
  it('accepts each valid time range key', () => {
    expect(resolveTimeRangeKey('h')).toBe('h');
    expect(resolveTimeRangeKey('d')).toBe('d');
    expect(resolveTimeRangeKey('w')).toBe('w');
    expect(resolveTimeRangeKey('m')).toBe('m');
    expect(resolveTimeRangeKey('y')).toBe('y');
  });

  it('falls back to "d" for an invalid or missing key', () => {
    expect(resolveTimeRangeKey('invalid')).toBe('d');
    expect(resolveTimeRangeKey(undefined)).toBe('d');
  });
});

describe('getAggregateConfig', () => {
  it('returns the expected bucket and cache settings for each range', () => {
    expect(getAggregateConfig('h')).toEqual({
      rangeSeconds: 3600,
      bucketSeconds: 60,
      cacheSeconds: 60,
    });
    expect(getAggregateConfig('d')).toEqual({
      rangeSeconds: 86400,
      bucketSeconds: 300,
      cacheSeconds: 300,
    });
    expect(getAggregateConfig('w')).toEqual({
      rangeSeconds: 604800,
      bucketSeconds: 3600,
      cacheSeconds: 1800,
    });
    expect(getAggregateConfig('m')).toEqual({
      rangeSeconds: 2592000,
      bucketSeconds: 21600,
      cacheSeconds: 3600,
    });
    expect(getAggregateConfig('y')).toEqual({
      rangeSeconds: 31536000,
      bucketSeconds: 86400,
      cacheSeconds: 21600,
    });
  });
});
