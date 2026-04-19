const express = require('express');
const https = require('https');
const router = express.Router();
const { authenticateToken } = require('../utils/authHandler');

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NEGATIVE_CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 7000;
const UPSTREAM_COOLDOWN_MS = 30 * 1000;
const inMemoryCache = new Map();
let lastUpstreamFailureAt = 0;

function normalizeQuery(value) {
  return String(value || '').trim().toLowerCase();
}

function getCache(key) {
  const item = inMemoryCache.get(key);
  if (!item) return { exists: false, value: null };

  const isExpired = Date.now() - item.cachedAt > item.ttlMs;
  if (isExpired) {
    inMemoryCache.delete(key);
    return { exists: false, value: null };
  }

  return { exists: true, value: item.value };
}

function setCache(key, value, ttlMs = CACHE_TTL_MS) {
  inMemoryCache.set(key, {
    value,
    ttlMs,
    cachedAt: Date.now(),
  });
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'SmartRoute/1.0 (geocoding-proxy)',
          'Accept-Language': 'vi',
        },
      },
      (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const upstreamError = new Error(`Nominatim HTTP ${res.statusCode}`);
            upstreamError.statusCode = res.statusCode;
            return reject(upstreamError);
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        });
      }
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Nominatim timeout ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on('error', (error) => reject(error));
    req.end();
  });
}

router.get('/search', authenticateToken, async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Thieu tham so q'
      });
    }

    const cacheKey = normalizeQuery(query);
    const cached = getCache(cacheKey);
    if (cached.exists) {
      return res.status(200).json({
        success: true,
        source: 'cache',
        result: cached.value,
      });
    }

    const inCooldown = Date.now() - lastUpstreamFailureAt < UPSTREAM_COOLDOWN_MS;
    if (inCooldown) {
      return res.status(200).json({
        success: true,
        source: 'degraded',
        result: null,
      });
    }

    const url = `${NOMINATIM_BASE_URL}?format=jsonv2&limit=1&countrycodes=vn&q=${encodeURIComponent(query)}`;
    const data = await requestJson(url);

    const first = Array.isArray(data) ? data[0] : null;
    if (!first || !first.lat || !first.lon) {
      setCache(cacheKey, null, NEGATIVE_CACHE_TTL_MS);
      return res.status(200).json({
        success: true,
        source: 'nominatim',
        result: null,
      });
    }

    const result = {
      lat: Number(first.lat),
      lng: Number(first.lon),
      displayName: first.display_name || '',
    };

    setCache(cacheKey, result);
    lastUpstreamFailureAt = 0;

    return res.status(200).json({
      success: true,
      source: 'nominatim',
      result,
    });
  } catch (error) {
    lastUpstreamFailureAt = Date.now();
    const query = String(req.query.q || '').trim();
    if (query) {
      setCache(normalizeQuery(query), null, NEGATIVE_CACHE_TTL_MS);
    }

    return res.status(200).json({
      success: true,
      source: 'upstream_unavailable',
      result: null,
      warning: 'Geocoding service tam thoi khong kha dung',
    });
  }
});

module.exports = router;
