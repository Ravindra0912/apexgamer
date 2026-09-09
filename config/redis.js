// BullMQ needs a connection options object here, not a raw URL string or a
// pre-built ioredis client — it sets maxRetriesPerRequest itself when given a
// plain object (required for blocking commands), but only if it does that
// construction internally. Upstash issues a single rediss:// URL (TLS), so
// it's parsed into the same object shape rather than passed through as-is.
const buildRedisConnection = () => {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || "6379"),
      username: url.username || undefined,
      password: url.password || undefined,
      tls: url.protocol === "rediss:" ? {} : undefined,
    };
  }

  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  };
};

module.exports = buildRedisConnection();
