import { checkRateLimit } from '../server/rate-limit.js';
import { validProductBarcode, normalizeFoodProduct } from '../shared/food-product.js';
import { allowedOrigin } from '../shared/http-origins.js';
export default async function handler(req, res) {
  const origin = req.headers?.origin;
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (allowedOrigin(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const code = req.query?.code;
  if (!validProductBarcode(code)) return res.status(400).json({ error: 'invalid_barcode' });
  if (!checkRateLimit(req, 30, 60000, 'food-product')) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'lookup_rate_limited' });
  }
  try {
    const fields =
      'code,product_name,product_name_en,brands,nutriments,nutrition_data_per,product_quantity_unit,last_modified_t,data_quality_errors_tags,ingredients_text,allergens';
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v3/product/${code}?fields=${fields}`,
      {
        headers: { 'User-Agent': 'HealthChain360/1.0 (https://healthchain360.com)' },
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      }
    );
    if (response.status === 404) return res.status(404).json({ error: 'product_not_found' });
    if (!response.ok) return res.status(502).json({ error: 'catalog_unavailable' });
    const product = normalizeFoodProduct(await response.json(), code);
    if (!product) return res.status(404).json({ error: 'product_not_found' });
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=3600');
    return res.status(200).json({ product });
  } catch {
    return res.status(502).json({ error: 'catalog_unavailable' });
  }
}
