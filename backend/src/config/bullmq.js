import { URL } from "url";

const getBullMQConnection = () => {
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  try {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parseInt(parsed.port || "6379", 10),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
    };
  } catch (error) {
    console.error("Error parsing REDIS_URL for BullMQ connection, using localhost default");
    return {
      host: "127.0.0.1",
      port: 6379,
    };
  }
};

export {
  getBullMQConnection,
};
