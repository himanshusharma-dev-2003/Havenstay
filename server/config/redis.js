const { createClient } = require('redis');
const { logger } = require('../logger');

/**
 * Redis client module.
 *
 * Creates a single shared Redis client for the entire process.
 * Controllers must NEVER import this module directly — they should use
 * `services/cache.service.js`, which wraps every operation in fault-tolerant
 * try/catch blocks so a Redis outage never crashes the API.
 *
 * Connection lifecycle:
 *   - connect()  is called from server.js bootstrap (non-blocking — app
 *     starts even if Redis is unavailable).
 *   - quit()     is called from the graceful shutdown handler in server.js.
 *
 * The redis v4 client uses socket-level auto-reconnect by default, with
 * exponential backoff built into the library. No additional reconnect
 * configuration is required.
 */

let client = null;

/**
 * Initialises the Redis client and connects to the server.
 *
 * Safe to call without awaiting at startup — the returned promise resolves
 * once connected or rejects if the initial connection fails. Either way,
 * the HTTP server is already listening; failures are logged and the
 * cacheService falls back to MongoDB transparently.
 *
 * @returns {Promise<void>}
 */
const connectRedis = async () => {
  const url = process.env.REDIS_URL;

  if (!url) {
    logger.warn('REDIS_URL is not set — Redis cache disabled. Falling back to MongoDB for all reads.');
    return;
  }

  client = createClient({
    url,
    socket: {
      // Reconnect strategy: exponential backoff capped at 10 seconds.
      // Called by the redis library each time a reconnect is attempted.
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis: max reconnection attempts reached — giving up');
          return new Error('Max Redis reconnection attempts exceeded');
        }
        const delay = Math.min(retries * 200, 10_000);
        logger.warn({ retries, delay }, 'Redis: reconnecting…');
        return delay;
      },
    },
  });

  // ── Event listeners ─────────────────────────────────────────────
  client.on('connect',      () => logger.info('⚡ Redis connecting…'));
  client.on('ready',        () => logger.info('✅ Redis connected and ready'));
  client.on('end',          () => logger.info('🔌 Redis connection closed'));
  client.on('reconnecting', () => logger.warn('Redis reconnecting…'));
  client.on('error',        (err) => logger.error({ err }, 'Redis client error'));

  try {
    await client.connect();
  } catch (err) {
    logger.error({ err }, '❌ Redis initial connection failed — cache disabled, falling back to MongoDB');
    client = null; // Ensure the cache service sees a null client (fallback path)
  }
};

/**
 * Gracefully closes the Redis connection.
 * Called from server.js SIGTERM/SIGINT shutdown handler.
 *
 * @returns {Promise<void>}
 */
const disconnectRedis = async () => {
  if (client) {
    await client.quit();
    logger.info('Redis disconnected gracefully');
    client = null;
  }
};

/**
 * Returns the active Redis client, or null if Redis is unavailable.
 * The cache service uses this to determine whether to attempt cache operations.
 *
 * @returns {import('redis').RedisClientType | null}
 */
const getClient = () => client;

module.exports = { connectRedis, disconnectRedis, getClient };
