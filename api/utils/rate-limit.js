const rateLimitCache = new Map();

/**
 * Basic in-memory rate limiter for Vercel Serverless Functions.
 * Note: Since Vercel spins up multiple isolated instances, this only limits traffic 
 * per individual lambda instance. It mitigates basic brute-force but does not replace 
 * global rate limiting (e.g. Vercel KV Rate Limit).
 * 
 * @param {object} req - Express/Node request object
 * @param {number} limit - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} True if allowed, false if rate limited
 */
export function checkRateLimit(req, limit = 10, windowMs = 60000) {
  // Try to get IP from Vercel headers, fallback to socket
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!rateLimitCache.has(ip)) {
    rateLimitCache.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const record = rateLimitCache.get(ip);
  
  // If the time window has passed, reset the count
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return true;
  }
  
  // If they exceeded the limit within the window
  if (record.count >= limit) {
    return false;
  }
  
  // Otherwise, increment and allow
  record.count += 1;
  return true;
}
