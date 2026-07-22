const { getClient } = require('../config/redis');
const { logger } = require('../logger');

/**
 * CacheService — the single abstraction layer between controllers and Redis.
 *
 * Design principles:
 *  - Controllers import THIS module, never the Redis client directly.
 *  - Every public method is fault-tolerant: if Redis is unavailable (null
 *    client, connection error, command error), the method logs the failure
 *    and returns a safe no-op value (null / undefined).
 *  - This means the entire caching layer can fail completely without
 *    affecting a single API response — controllers always fall through to MongoDB.
 *  - JSON serialisation/deserialisation is handled here so callers work with
 *    plain JavaScript objects, not Redis strings.
 *
 * Cache key conventions (all keys are namespaced with 'havenstay:'):
 *   havenstay:hotels:{queryHash}          → paginated hotel list
 *   havenstay:hotel:{id}                  → single hotel + rooms
 *   havenstay:featured-hotels             → featured=true listing (hot path)
 *   havenstay:rooms:{hotelId}             → rooms for a hotel (no dates)
 *   havenstay:availability:{roomId}:{in}:{out} → per-room availability
 */

/** Global namespace prefix — prevents key collisions if this Redis instance
 *  is shared with other services in the future. */
const NS = 'havenstay:';

/**
 * Prefix a raw key with the global namespace.
 * @param {string} key
 * @returns {string}
 */
const k = (key) => `${NS}${key}`;

// ── Core operations ───────────────────────────────────────────────

/**
 * Retrieves a cached value by key.
 *
 * @param {string} key - Raw cache key (without namespace prefix)
 * @returns {Promise<any|null>} Parsed value, or null on miss / Redis failure
 */
const get = async (key) => {
  const client = getClient();
  if (!client) return null; // Redis disabled or not connected

  try {
    const raw = await client.get(k(key));
    if (raw === null) {
      logger.debug({ key }, 'Cache MISS');
      return null;
    }
    logger.debug({ key }, 'Cache HIT');
    return JSON.parse(raw);
  } catch (err) {
    logger.warn({ err, key }, 'Redis GET failed — falling back to MongoDB');
    return null;
  }
};

/**
 * Stores a value in Redis with a TTL.
 *
 * @param {string} key        - Raw cache key (without namespace prefix)
 * @param {any}    value      - Value to cache (will be JSON-serialised)
 * @param {number} ttlSeconds - Expiry in seconds
 * @returns {Promise<void>}
 */
const set = async (key, value, ttlSeconds) => {
  const client = getClient();
  if (!client) return;

  try {
    await client.set(k(key), JSON.stringify(value), { EX: ttlSeconds });
    logger.debug({ key, ttlSeconds }, 'Cache SET');
  } catch (err) {
    logger.warn({ err, key }, 'Redis SET failed — continuing without cache');
  }
};

/**
 * Deletes one or more specific keys from Redis.
 *
 * @param {...string} keys - Raw cache keys (without namespace prefix)
 * @returns {Promise<void>}
 */
const del = async (...keys) => {
  const client = getClient();
  if (!client || keys.length === 0) return;

  try {
    const namespacedKeys = keys.map(k);
    await client.del(namespacedKeys);
    logger.debug({ keys }, 'Cache DEL');
  } catch (err) {
    logger.warn({ err, keys }, 'Redis DEL failed');
  }
};

/**
 * Deletes all keys matching a glob pattern using SCAN + DEL.
 *
 * IMPORTANT: Never uses KEYS * (blocks Redis event loop under load).
 * SCAN iterates in batches — safe in production at any scale.
 *
 * @param {string} pattern - Glob pattern WITHOUT namespace prefix
 *                           e.g. 'hotels:*' becomes 'havenstay:hotels:*'
 * @returns {Promise<void>}
 */
const delPattern = async (pattern) => {
  const client = getClient();
  if (!client) return;

  const fullPattern = k(pattern);

  try {
    let cursor = 0;
    let deleted = 0;

    do {
      const reply = await client.scan(cursor, {
        MATCH: fullPattern,
        COUNT: 100, // Scan up to 100 keys per iteration
      });
      cursor = reply.cursor;

      if (reply.keys.length > 0) {
        await client.del(reply.keys);
        deleted += reply.keys.length;
      }
    } while (cursor !== 0); // cursor returns to 0 when scan is complete

    logger.debug({ pattern: fullPattern, deleted }, 'Cache DEL pattern');
  } catch (err) {
    logger.warn({ err, pattern: fullPattern }, 'Redis DEL pattern failed');
  }
};

/**
 * Flushes ALL keys under this application's namespace.
 * Used as a last-resort full invalidation (e.g. data migrations).
 * Prefer targeted del/delPattern over flush in production.
 *
 * @returns {Promise<void>}
 */
const flush = async () => {
  await delPattern('*');
  logger.info('Cache FLUSH (all havenstay:* keys deleted)');
};

// ── Convenience wrappers for named cache regions ──────────────────

/**
 * Cache-aside helper: get value or compute it and cache the result.
 *
 * @param {string}            key        - Raw cache key
 * @param {number}            ttl        - TTL in seconds
 * @param {() => Promise<any>} fetchFn   - Async function to compute value on cache miss
 * @returns {Promise<any>}
 */
const getOrSet = async (key, ttl, fetchFn) => {
  const cached = await get(key);
  if (cached !== null) return cached;

  const value = await fetchFn();
  if (value !== null && value !== undefined) {
    await set(key, value, ttl);
  }
  return value;
};

module.exports = { get, set, del, delPattern, flush, getOrSet };
