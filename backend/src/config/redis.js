import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("Redis Connected Successfully"));

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error(`Failed to connect to Redis: ${error.message}`);
  }
};

export {
  redisClient,
  connectRedis,
  redisUrl,
};
