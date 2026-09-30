import { beforeEach, describe, it, expect, vi } from 'vitest';
const limited = vi.hoisted(() => ({ allow: true }));
vi.mock('../../../api/utils/rate-limit.js', () => ({ checkRateLimit: () => limited.allow }));
import handler from '../../../api/food-product.js';
import { allowedOrigin } from '../../../shared/http-origins.js';
const response = () => ({
  headers: {},
  statusCode: 0,
  body: null,
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(value) {
    this.body = value;
    return this;
  },
  end() {
    return this;
  },
});
describe('public food catalog endpoint', () => {
  beforeEach(() => {
    limited.allow = true;
    vi.unstubAllGlobals();
  });
  it('allows native and real site origins without allowing a spoofed domain suffix', async () => {
    expect(allowedOrigin('https://localhost')).toBe(true);
    expect(allowedOrigin('https://www.healthchain360.com')).toBe(true);
    expect(allowedOrigin('https://evilhealthchain360.com')).toBe(false);
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const res = response();
    await handler({ method: 'OPTIONS', headers: { origin: 'capacitor://localhost' } }, res);
    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('capacitor://localhost');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects malformed barcodes and repeated lookups before requesting the catalog', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    let res = response();
    await handler({ method: 'GET', headers: {}, query: { code: '3017620422004' } }, res);
    expect(res.statusCode).toBe(400);
    limited.allow = false;
    res = response();
    await handler({ method: 'GET', headers: {}, query: { code: '3017620422003' } }, res);
    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBe('60');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses the v3 catalog and returns source values with missing nutrients unchanged', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        product: {
          code: '3017620422003',
          product_name: 'Test food',
          nutrition_data_per: '100g',
          nutriments: { 'energy-kcal_100g': 300, proteins_100g: 4 },
          last_modified_t: 123,
        },
      }),
    }));
    vi.stubGlobal('fetch', fetcher);
    const res = response();
    await handler({ method: 'GET', headers: {}, query: { code: '3017620422003' } }, res);
    expect(res.statusCode).toBe(200);
    expect(fetcher.mock.calls[0][0]).toContain('/api/v3/product/3017620422003?fields=');
    expect(res.body.product.per100).toMatchObject({ calories: 300, protein: 4, carbs: null });
    expect(res.body.product.sourceId).toContain('/product/3017620422003');
    expect(res.headers['Cache-Control']).toContain('s-maxage=3600');
  });
  it('returns a recoverable failure for a catalog outage without inventing a product', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      })
    );
    const res = response();
    await handler({ method: 'GET', headers: {}, query: { code: '3017620422003' } }, res);
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: 'catalog_unavailable' });
  });
});
