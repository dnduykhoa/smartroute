const express = require('express');
const https = require('https');
const router = express.Router();
const { authenticateToken } = require('../utils/authHandler');

const OSRM_BASE_URL = 'https://router.project-osrm.org/trip/v1/driving';
const REQUEST_TIMEOUT_MS = 7000;

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'SmartRoute/1.0 (routing-proxy)',
        },
      },
      (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`OSRM HTTP ${res.statusCode}`));
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
      req.destroy(new Error(`OSRM timeout ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on('error', (error) => reject(error));
    req.end();
  });
}

router.get('/trip', authenticateToken, async (req, res) => {
  try {
    const coords = String(req.query.coords || '').trim();
    const source = String(req.query.source || 'first').trim();
    const roundtrip = String(req.query.roundtrip || 'false').trim();

    if (!coords) {
      return res.status(400).json({
        success: false,
        message: 'Thieu tham so coords',
      });
    }

    const query = `?source=${encodeURIComponent(source)}&roundtrip=${encodeURIComponent(roundtrip)}&overview=false&steps=false`;
    const url = `${OSRM_BASE_URL}/${coords}${query}`;
    console.log(`[routing] Requesting: ${coords.substring(0, 60)}...`);
    
    const data = await requestJson(url);
    console.log(`[routing] OSRM response: code=${data.code}, waypoints=${data.waypoints?.length || 0}, trips=${data.trips?.length || 0}`);

    if (data.code !== 'Ok' || !Array.isArray(data.waypoints)) {
      console.warn(`[routing] OSRM invalid response, using heuristic fallback`);
      return res.status(200).json({
        success: true,
        source: 'fallback_heuristic',
        result: null,
        debug: { osrmCode: data.code, hasWaypoints: Array.isArray(data.waypoints) },
      });
    }

    console.log(`[routing] SUCCESS: returning ${data.waypoints.length} waypoints`);
    return res.status(200).json({
      success: true,
      source: 'osrm',
      result: {
        waypoints: data.waypoints,
        trips: data.trips || [],
      },
    });
  } catch (error) {
    console.error(`[routing] ERROR: ${error.message}`);
    return res.status(200).json({
      success: true,
      source: 'upstream_unavailable',
      result: null,
      error: 'Routing service tam thoi khong kha dung',
    });
  }
});

module.exports = router;
