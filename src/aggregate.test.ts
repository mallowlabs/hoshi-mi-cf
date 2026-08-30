import {
  getAggregateConfig,
  parseCustomRange,
  resolveRange,
  resolveTimeRangeKey,
} from './aggregate';

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

describe('parseCustomRange', () => {
  it('parses valid from/to values', () => {
    expect(parseCustomRange('100', '200')).toEqual({ from: 100, to: 200 });
  });

  it('returns undefined when either value is missing', () => {
    expect(parseCustomRange(undefined, '200')).toBeUndefined();
    expect(parseCustomRange('100', undefined)).toBeUndefined();
  });

  it('returns undefined for non-numeric or inverted values', () => {
    expect(parseCustomRange('abc', '200')).toBeUndefined();
    expect(parseCustomRange('200', '100')).toBeUndefined();
    expect(parseCustomRange('100', '100')).toBeUndefined();
  });
});

describe('resolveRange', () => {
  const now = 1_000_000;

  it('resolves a preset range when no custom from/to is given', () => {
    expect(resolveRange({ t: 'h' }, now)).toEqual({
      mode: 'preset',
      t: 'h',
      sinceTs: now - 3600,
      untilTs: now,
      bucketSeconds: 60,
      cacheSeconds: 60,
    });
  });

  it('resolves a custom range and picks a bucket size for its duration', () => {
    expect(
      resolveRange({ from: String(now - 3600), to: String(now) }, now),
    ).toEqual({
      mode: 'custom',
      sinceTs: now - 3600,
      untilTs: now,
      bucketSeconds: 60,
      cacheSeconds: 60,
    });
  });

  it('clamps a custom "to" in the future to now', () => {
    const range = resolveRange(
      { from: String(now - 3600), to: String(now + 3600) },
      now,
    );
    expect(range.untilTs).toBe(now);
  });

  it('clamps a custom range longer than the widest preset', () => {
    const oneYear = 365 * 24 * 60 * 60;
    const range = resolveRange(
      { from: String(now - oneYear * 2), to: String(now) },
      now,
    );
    expect(range.sinceTs).toBe(now - oneYear);
  });

  it('falls back to the preset range for invalid custom values', () => {
    expect(resolveRange({ t: 'd', from: '200', to: '100' }, now)).toEqual({
      mode: 'preset',
      t: 'd',
      sinceTs: now - 86400,
      untilTs: now,
      bucketSeconds: 300,
      cacheSeconds: 300,
    });
  });
});
