import type { MiddlewareHandler } from 'hono';
import type { Bindings } from './types';

export const bearerAuth: MiddlewareHandler<{ Bindings: Bindings }> = async (
  c,
  next,
) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : undefined;

  if (!token || !(await tokensMatch(token, c.env.API_TOKEN))) {
    return c.text('Unauthorized', 401);
  }

  await next();
};

async function tokensMatch(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  return crypto.subtle.timingSafeEqual(bufA, bufB);
}
