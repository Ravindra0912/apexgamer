const { Queue } = require("bullmq");
const redisConnection = require("../../../config/redis");

const gamesQueue = new Queue("games", {
     connection: redisConnection,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 5000,
            },
        }
    });

module.exports = gamesQueue;
